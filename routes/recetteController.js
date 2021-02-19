// Imports
var models   = require('../models');
var asyncLib = require('async');
var jwtUtils = require('../utils/jwt.utils');

module.exports = {

    listRecette: function(req, res) {
        var headerAuth  = req.headers['authorization'];
        var userId = jwtUtils.getUserId(headerAuth);
        var limit   = parseInt(req.query.limit);
        var offset  = parseInt(req.query.offset);
        var userIdQuery  = parseInt(req.query.userId);
        let recettesFinal = null;
        let totalRecettes = 0;

        asyncLib.waterfall([
            function(done) {
                models.User.findOne({
                    where: {id: userId}
                }).then(function(userFound) {
                    done(userFound);
                }).catch(function(err) {
                    return res.status(500).json({'error': 'Unable to verify user'});
                });
            }
        ], async function(userFound) {
            if (userFound) {
                await models.Recette.findAll({
                    where: {userId: userIdQuery},
                    limit: (!isNaN(limit)) ? limit : null,
                    offset: (!isNaN(offset)) ? offset : null,
                    include: [
                        {
                            model: models.User,
                            attributes: [ 'username' ]
                        },
                        {
                            model: models.Ingredient,
                            attributes: ['name', 'quantite', 'unite']
                        }
                    ]
                })
                .then(function(recettes) {
                    if (recettes) {
                        recettesFinal = recettes;
                    }
                })
                .catch(function(err) {
                    console.log(err);
                    return res.status(500).json({'error': 'Probleme with recettes'});
                });

                await models.Recette.count({}).then(function(counted) {
                    totalRecettes = counted;
                });

                if (recettesFinal && totalRecettes > 0) {
                    return res.status(200).json({resultRecettes: recettesFinal, totalRecette: totalRecettes});
                }

            }
        });
    },

    getRecette: function(req, res) {
        var headerAuth  = req.headers['authorization'];
        var userId = jwtUtils.getUserId(headerAuth);
        var idRecette   = parseInt(req.params.idRecette);
        var userIdQuery  = parseInt(req.query.userId);

        asyncLib.waterfall([
            function(done) {
                models.User.findOne({
                    where: {id: userId}
                }).then(function(userFound) {
                    done(userFound);
                }).catch(function(err) {
                    return res.status(500).json({'error': 'Unable to verify user'});
                });
            }
        ], function(userFound) {
            if (userFound) {
                models.Recette.findOne({
                    where: {id: idRecette, userId: userIdQuery},
                    include: [
                        {
                            model: models.User,
                            attributes: [ 'username' ]
                        },
                        {
                            model: models.Ingredient,
                            attributes: ['id', 'name', 'quantite', 'unite']
                        }
                    ]
                })
                .then(function(recette) {
                    if (recette) {
                        return res.status(200).json(recette);
                    }
                })
                .catch(function(err) {
                    console.log(err);
                    return res.status(500).json({'error': 'Probleme with recettes'});
                });
            }
        });
    },

    createRecette: function(req, res) {
        // Getting auth header
        var headerAuth  = req.headers['authorization'];
        var userId = jwtUtils.getUserId(headerAuth);

        var name = req.body.recetteName;
        var description = req.body.recetteDescription;
        var ingredient = req.body.ingredient;

        var idIngredients = [];
        var addedRecetteIngredient = [];


        asyncLib.waterfall([
            function(done) {
                models.User.findOne({
                  where: { id: userId }
                })
                .then(function(userFound) {
                  done(null, userFound);
                })
                .catch(function(err) {
                  return res.status(500).json({ 'error': 'unable to verify user' });
                });
            },
            function(userFound, done) {
                if (userFound) {
                    models.Recette.create({
                        name: name,
                        description: description,
                        UserId: userFound.id
                    }).then(function(newRecette) {
                        done(newRecette);
                    }).catch(function(err) {
                        return err;
                    });
                } else {
                    return res.status(404).json({ 'error': 'user not found' });
                }
            }
        ], function(newRecette) {
            if (newRecette) {
                if (ingredient) {


                    if (ingredient.length === 0) {
                        return res.status(201).json({ 'success': 'Tout fonctionne', 'isCreated': true});
                    } else {
                        var inc = 0;

                        var bar = new Promise((resolve, reject) => {
                            ingredient.forEach(async (element, index, array) => {
                                var ingredientRet = await models.Ingredient.create({
                                    name: element.name,
                                    quantite: element.quantite,
                                    unite: element.unite
                                });
    
                                if (ingredientRet) {
                                    idIngredients.push(ingredientRet);
    
                                    // Insertion dans RecetteIngredient
                                    var ingredientRecette = await newRecette.addIngredient(ingredientRet);
                                    if (ingredientRecette) {
                                        inc++;
    
                                        ingredientRecette.forEach((element) => {
                                            addedRecetteIngredient.push(element.recette_id);
                                        });
    
                                    } else {
                                        return res.status(500).json({ 'success': 'RecetteIngredient non inséré.'});
                                    }
                                } else {
                                    return res.status(500).json({ 'success': 'Ingrédient non inséré.'});
                                }
    
                                if (inc === ingredient.length) {
                                    resolve();
                                };
    
                            });
                        });
    
    
                        bar.then(() => {
                            if (idIngredients.length == ingredient.length && addedRecetteIngredient.length == ingredient.length) {
                                return res.status(201).json({ 'success': 'Tout fonctionne', 'isCreated': true});
                            } else {
                                return res.status(201).json({ 'success': 'Y a une erreur'});
                            }
                        });
                    }
                }
            } else {
                return res.status(404).json({ 'error': 'Message non créé.'});
            }
        });
    },

    updateRecetteIngredient: function(req, res) {
        var headerAuth  = req.headers['authorization'];
        var userId = jwtUtils.getUserId(headerAuth);


        var idRecetteIngredient = [];
        var idIngredientToRemove = [];

        var recetteId = req.body.recetteId;
        var recetteNameUpdated = req.body.recetteName;
        var recetteDescriptionUpdated = req.body.recetteDescription;
        var ingredientUpdated = req.body.ingredient;
        var userIdQuery  = parseInt(req.query.userId);

        asyncLib.waterfall([
            function(done) {
                models.User.findOne({
                  where: { id: userId }
                })
                .then(function(userFound) {
                  done(null, userFound);
                })
                .catch(function(err) {
                  return res.status(500).json({ 'error': 'unable to verify user' });
                });
            },
            function(userFound, done) {
                if (userFound) {
                    models.Recette.findOne({
                        attributes: ['id'],
                        where: { id: recetteId, userId: userIdQuery}
                    }).then(function(getRecette) {
                        done(getRecette, userFound);
                    }).catch(function(err) {
                        return err;
                    });
                } else {
                    return res.status(404).json({ 'error': 'user not found' });
                }
            },
        ],
        async function(getRecette, userFound) {
            if (getRecette) {

                var getRecetteUpdated = await getRecette.update({
                    "name": recetteNameUpdated,
                    "description": recetteDescriptionUpdated,
                    "userId": userFound.id
                });

                var getRecetteIngredient = await models.RecetteIngredient.findAll({
                    attributes: ['id', 'ingredient_id'],
                    where: { recette_id: getRecette.id }
                });

                getRecetteIngredient.forEach(element => {
                    idRecetteIngredient.push(element.ingredient_id);
                    idIngredientToRemove.push(element.ingredient_id);
                });

                if (getRecetteUpdated) {
                    var inc = 0;

                    if ((ingredientUpdated.length > 0 && getRecetteIngredient.length > 0) || (ingredientUpdated.length > 0 && getRecetteIngredient.length == 0)) {
                        var promiseForEach = new Promise((resolve, reject) => {
                            ingredientUpdated.forEach(async (element, index, array) => {
    
                                const indexElementToRemove = idIngredientToRemove.indexOf(element.id);
                                if (indexElementToRemove > -1) {
                                    idIngredientToRemove.splice(indexElementToRemove, 1);
                                }
                                
                                if (!element.id) {
                                    var createUpdateIngredient = await models.Ingredient.create({
                                        name: element.name,
                                        quantite: element.quantite,
                                        unite: element.unite
                                    });
                                    if (createUpdateIngredient) {
                                        var createUpdatedRecetteIngredient = await getRecette.addIngredient(createUpdateIngredient);
    
                                        if (createUpdatedRecetteIngredient) {
                                            inc++;
                                        }
                                    }
                                }
                                
                                if (element.id && idRecetteIngredient.indexOf(element.id) != -1) {
                                  
                                    var updateExistantIngredient = await models.Ingredient.update({
                                        name: element.name,
                                        quantite: element.quantite,
                                        unite: element.unite
                                    }, {where: {"id": element.id}});
    
                                    if (updateExistantIngredient) {
                                        inc++;
                                    }
    
                                } /*else {
                                    var destroyUpdatedIngredient = await models.Ingredient.destroy({
                                        where: {id: element.id}
                                    });
                                    if (destroyUpdatedIngredient) {
                                        var destroyRecetteIngredientLink = await models.RecetteIngredient.destroy({
                                            where: {ingredient_id: element.id}
                                        });
    
                                        if (destroyRecetteIngredientLink) {
                                            console.log(destroyRecetteIngredientLink);
                                            inc++;
                                        } else {
    
                                        }
                                        
                                    } else {
    
                                    }
                                    
                                }*/
    
                                if (inc === ingredientUpdated.length) {
                                    resolve();
                                };
                            });
                        });
    
                        promiseForEach.then(() => {
                            var incremove = 0;
                            var promiseDelete = new Promise((resolve, reject) => {
                                idIngredientToRemove.forEach(async (element) => {
    
                            
    
                                    var destroyRecetteIngredientLink = await models.RecetteIngredient.destroy({
                                        where: {ingredient_id: element}
                                    });
    
                                    if (destroyRecetteIngredientLink) {
                                        var destroyUpdatedIngredient = await models.Ingredient.destroy({
                                            where: {id: element}
                                        });
    
                                        if (destroyUpdatedIngredient) {
                                            incremove++;
                                        } else {
                                            return res.status(404).json({ 'error': 'Destruction de l ingredient est impossible.' });
                                        }
                                        
                                    } else {
                                        return res.status(404).json({ 'error': 'Destruction de recetteIngredient est impossible.' });
                                    }
    
    
                                    if (incremove == idIngredientToRemove.length) {
                                        resolve();
                                    }
                                });
                            });
                        });
                    } 
                    if (ingredientUpdated.length == 0 && getRecetteIngredient.length > 0) {
                        var destroyRecetteIngredientLink = await models.RecetteIngredient.destroy({
                            where: {ingredient_id: idIngredientToRemove}
                        });

                        if (destroyRecetteIngredientLink) {
                            var destroyUpdatedIngredient = await models.Ingredient.destroy({
                                where: {id: idIngredientToRemove}
                            });

                            if (!destroyUpdatedIngredient) {
                                return res.status(404).json({ 'error': 'Destruction de l ingredient est impossible.' });
                            } 
                            
                        } else {
                            return res.status(404).json({ 'error': 'Destruction de recetteIngredient est impossible.' });
                        }
                    }
                    

                    
                }

                return res.status(200).json({ 'success': 'Mise à jour effectuée', 'isUpdated': true });


            } else {
                return res.status(404).json({ 'error': 'Recette non trouvée.' });
            }
        });
    },

    deleteRecetteIngredient: function(req, res) {
        var headerAuth  = req.headers['authorization'];
        var userId = jwtUtils.getUserId(headerAuth);


        var idRecetteIngredient = [];
        var idIngredientToRemove = [];

        var recetteId = req.body.recetteId;


        asyncLib.waterfall([
            function(done) {
                models.User.findOne({
                  where: { id: userId }
                })
                .then(function(userFound) {
                  done(null, userFound);
                })
                .catch(function(err) {
                  return res.status(500).json({ 'error': 'unable to verify user' });
                });
            },
            function(userFound, done) {
                if (userFound) {
                    models.Recette.findOne({
                        attributes: ['id'],
                        where: { id: recetteId }
                    }).then(function(getRecette) {
                        done(null, getRecette);
                    }).catch(function(err) {
                        return err;
                    });
                } else {
                    return res.status(404).json({ 'error': 'user not found' });
                }
            },
            function(getRecette, done) {
                if (getRecette) {
                    models.RecetteIngredient.findAll({
                        attributes: ['id', 'ingredient_id'],
                        where: { recette_id: getRecette.id }
                    }).then(function(getRecetteIngredient) {
                        done(getRecetteIngredient, getRecette);
                    }).catch(function(err) {
                        return err;
                    });
                } else {
                    return res.status(404).json({ 'error': 'recette non trouvée' });
                }
            },
        ], 
        async function(getRecetteIngredient, getRecette) {
            console.log(getRecetteIngredient);
            console.log(getRecette);
            if (getRecetteIngredient || getRecette) {

                // Si recetteIngredient est vide mais que la recette existe
                if ((getRecetteIngredient && getRecetteIngredient.length === 0) && getRecette) {
                    var deletedRecette = await models.Recette.destroy({
                        where: {id: getRecette.id}
                    });

                    if (deletedRecette === 1) {
                        return res.status(200).json({ 'success': true});
                    } else {
                        return res.status(404).json({ 'error': 'Recette non supprimée.'});
                    }
                } else {
                    var incremove = 0;

                    var promiseDeleteRecetteIngredient = new Promise((resolve, reject) => {
                        getRecetteIngredient.forEach(async (element) => {
                            var destroyRecetteIngredientLink = await models.RecetteIngredient.destroy({
                                where: {ingredient_id: element.ingredient_id}
                            });
    
                            if (destroyRecetteIngredientLink) {
                                var destroyUpdatedIngredient = await models.Ingredient.destroy({
                                    where: {id: element.ingredient_id}
                                });
    
                                if (destroyUpdatedIngredient) {
                                    incremove++;
                                } else {
                                    return res.status(404).json({ 'error': 'Destruction de l ingredient est impossible.' });
                                }
                                
                            } else {
                                return res.status(404).json({ 'error': 'Destruction de recetteIngredient est impossible.' });
                            }
    
    
                            if (incremove == getRecetteIngredient.length) {
                                resolve();
                            }
                        });
                    });
    
                    promiseDeleteRecetteIngredient.then(async () => {
                        var deletedRecette = await models.Recette.destroy({
                            where: {id: getRecette.id}
                        });
    
                        if (deletedRecette === 1) {
                            return res.status(200).json({ 'success': true});
                        } else {
                            return res.status(404).json({ 'error': 'Recette non supprimée.'});
                        }
                    });
                }



                /*var destroyRecette = await models.Recette.destroy({
                    where: {id: getRecette.id}
                });*/
    
                //console.log(destroyRecette);
            } else {
                return res.status(404).json({ 'error': 'RecetteIngredients non trouvées.'});
            }

        });

    }
}

