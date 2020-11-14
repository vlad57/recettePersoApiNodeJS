'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RecetteIngredient extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {

      models.Recette.belongsToMany(models.Ingredient, {
        through: models.RecetteIngredient,
        foreignKey: 'recette_id',
        otherKey: 'ingredient_id'
      });
  
      models.Ingredient.belongsToMany(models.Recette, {
        through: models.RecetteIngredient,
        foreignKey: 'ingredient_id',
        otherKey: 'recette_id',
      });
  
      models.RecetteIngredient.belongsTo(models.Recette, {
        foreignKey: 'recette_id',
        as: 'recette',
      });
  
      models.RecetteIngredient.belongsTo(models.Ingredient, {
        foreignKey: 'ingredient_id',
        as: 'ingredient',
      });


    }
  };
  RecetteIngredient.init({
    recette_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Recette',
        key: 'id'
      }
    },

    ingredient_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Ingredient',
        key: 'id'
      }
    }

  }, {
    sequelize,
    modelName: 'RecetteIngredient',
  });
  return RecetteIngredient;
};