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
  
  return system_settings_form($form);
}

function simplegeo_map_settings_validate($form, &$form_state) {
  if (!is_numeric($form_state['values']['simplegeo_api_max_node_info'])) {
    error_log(var_export($form_state['values']['simplegeo_api_max_node_info'], TRUE));
    form_set_error('simplegeo_api_max_node_info', t('Maximum number of nodes must be numeric'));
  }
}