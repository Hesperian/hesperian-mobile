# Adding a new language

Say new language with short language code `pt` - Portugese

## Copy the files

* Copy from existing langage, usually `en` 
* `www/locales/en` -> `www/locales/pt`
* Some apps may have other `locales` modules that need copying, depending on structure `find www -name locales`, if so, copy there as well.

## Change the code

* Modify files to include the new language:
  * `app-config.json` - order here controls order in menus.
  * `www/js/app.js` - main entry point needs code to import the resources and register them.

## Don't forget to commit

 * `git add www/locales/pt/` and any other locales/pt folders created
 * `git add www/js/app.js app-config.json`
 * `git commit`
 * `git push`