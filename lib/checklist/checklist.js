/*
 * Support user checklists
 *
 *   
 */

import {
  Dom7,
  Template7
} from 'framework7/framework7.esm.bundle.js';
import {
  appConfig,
  resources
} from 'hesperian-mobile';


import './checklist.scss';

const $$ = Dom7;


function getConfigCheckLists() {
    const checklists = appConfig.get('checklists');
    return checklists || {};
}

function setConfigCheckLists(checklists) {
  appConfig.set('checklists', Object.assign({}, checklists));
}

const checkboxTemplate = Template7.compile(`
<label class="checkbox">
  <input id="{{checklistId}}.{{checkboxId}}" type="checkbox" {{checked}}>
  <i class="icon-checkbox"></i>
</label>
`);


$$(document).on('page:init', function(_e, page) {
  const checklists = getConfigCheckLists();

  page.$el.find('.checklist').each( function() {
    const $cl = $$(this);
    const checklistId = $cl.data('checklist-id');
    $cl.children('li').each(function() {
      const $cb = $$(this);
      const checkboxId = $cb.data('checkbox-id');
      const checked = checklists[`${checklistId}.${checkboxId}`];
      const check = checkboxTemplate({
        checklistId,
        checkboxId,
        checked : checked ? 'checked' : ''
      });
      $cb.prepend(check);
    })  
  });
});

$$(document).on('change', '.checklist input[type=checkbox]', function(e) {
  const $check = $$(e.target);
  const checked = $check.prop('checked') || '';
  const id = $check.prop('id');
  const checklists = getConfigCheckLists();
  checklists[id] = !!checked;
  setConfigCheckLists(checklists)
});