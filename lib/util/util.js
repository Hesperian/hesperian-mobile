/*
 *  util.js
 *  low-evel utilites for use in the app, but also in compliation of the app
 */

 // canonical normal form for search: lowercase, no accents.
 function searchNormalForm(str) {
     return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
 }

 module.exports = {
    searchNormalForm: searchNormalForm
 };