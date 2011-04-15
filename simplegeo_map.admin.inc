<?php
/**
 * Displays the admin form for simlpegeo map
 */
function simplegeo_map_settings() {
  $form = array();
  
  // Theme selection
  $themes = simplegeo_map_marker_themes();
  $options = array();
  foreach ($themes as $name => $theme) {
    $options[$name] = $theme['title'];
  }
  
  $form['simplegeo_map_marker_theme'] = array(
    '#type'         => 'select',
    '#options'      => $options,
    '#title'        => t('Theme'),
    '#description'  => t('The theme determines the look of the markers on your map.'),
    '#default_value'=> variable_get('simplegeo_map_marker_theme', 'orange'),
  );
  
  if (module_exists('simplegeo_api')) {
    $form['simplegeo_api_max_node_info'] = array(
      '#type'         => 'textfield',
      '#title'        => t('Maximum number of nodes in info window'),
      '#description'  => t('Enter the maximum number of nodes you would like to show when user clicks a marker'),
      '#default_value'=> variable_get('simplegeo_api_max_node_info', SIMPLEGEO_API_MAX_NODE_INFO),
    );
  } else {
    $form['simplegeo_api_max_node_info'] = array(
      '#type'         => 'hidden',
      '#value'        => '20',
    );
  }

  $form['simplegeo_map_default_zoom'] = array(
    '#type' => 'select',
    '#title' => t('Default zoom'),
    '#description' => t('The default zoom level for the map'),
    '#options' => drupal_map_assoc(range(1, 21)),
    '#default_value' => variable_get('simplegeo_map_default_zoom', 12),
  );

  $form['simplegeo_map_permalink_hash'] = array(
    '#type' => 'checkbox',
    '#title' => t('Set url hash to enable linkning'),
    '#description' => t('If this is enabled the map will set a url hash (#) that represents the current state of the map. This can then be used to link to the ma in it\'s current state.'),
    '#default_value' => variable_get('simplegeo_map_permalink_hash', FALSE),
  );

  $plugins = array();
  foreach (module_implements('simplegeo_map_plugin') as $module) {
    $mp = call_user_func($module . '_simplegeo_map_plugin');
    foreach ($mp as $plug) {
      $plugins[$plug['name']] = $plug['title'];
    }
  }

  $form['simplegeo_map_plugins'] = array(
    '#type' => 'checkboxes',
    '#title' => t('Map plugins'),
    '#options' => $plugins,
    '#default_value' => variable_get('simplegeo_map_plugins', array(
      'simplegeo_map_infowindow' => 'simplegeo_map_infowindow',
    )),
  );

  return system_settings_form($form);
}

function simplegeo_map_settings_validate($form, &$form_state) {
  if (!is_numeric($form_state['values']['simplegeo_api_max_node_info'])) {
    form_set_error('simplegeo_api_max_node_info', t('Maximum number of nodes must be numeric'));
  }
}