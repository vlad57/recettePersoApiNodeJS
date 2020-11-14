//Imports
var express = require('express');
var cors = require('cors');
var usersCtrl = require('./routes/userController');
var recetteCtrl = require('./routes/recetteController');

//Router

exports.router = (function() {
    var apiRouter = express.Router();

    apiRouter.options('*', cors());

    // Users routes
    apiRouter.route('/user/register/').post(usersCtrl.register);
    apiRouter.route('/user/login/').post(usersCtrl.login);
    /*apiRouter.route('/users/me/').get(usersCtrl.getUserProfile);
    apiRouter.route('/users/me/').put(usersCtrl.updateUserProfile);

    apiRouter.route('/messages/new/').post(messagesCtrl.createMessage);
    apiRouter.route('/messages/').get(messagesCtrl.getMessages)*/

    apiRouter.route('/recette/list/').get(recetteCtrl.listRecette);
    apiRouter.route('/recette/:idRecette').get(recetteCtrl.getRecette);
    apiRouter.route('/recette/create/').post(recetteCtrl.createRecette);
    apiRouter.route('/recette/update/').post(recetteCtrl.updateRecetteIngredient);
    apiRouter.route('/recette/delete/').delete(recetteCtrl.deleteRecetteIngredient);

    apiRouter.route('/amIAuth').post(usersCtrl.amIAuth);

    return apiRouter;
})();