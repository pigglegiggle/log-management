const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'tenant'),
    allowNull: false,
    defaultValue: 'tenant',
  },
}, {
  timestamps: false, 
  tableName: 'users'
});

module.exports = User;
