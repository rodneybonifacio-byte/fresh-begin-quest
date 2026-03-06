UPDATE whatsapp_notification_templates 
SET variables = '[
  {"key": "nome_destinatario", "label": "Nome do Destinatário", "system_field": "nome_destinatario", "component_type": "BODY", "component_var_index": 1},
  {"key": "nome_remetente", "label": "Nome do Remetente", "system_field": "nome_remetente", "component_type": "BODY", "component_var_index": 2},
  {"key": "codigo_rastreio", "label": "Código de Rastreio", "system_field": "codigo_rastreio", "component_type": "BODY", "component_var_index": 3},
  {"key": "data_previsao_entrega", "label": "Previsão de Entrega", "system_field": "data_previsao_entrega", "component_type": "BODY", "component_var_index": 4},
  {"key": "codigo_rastreio_btn", "label": "Código de Rastreio (Botão)", "system_field": "codigo_rastreio", "component_type": "BUTTONS", "component_var_index": 1, "button_position": 0, "button_sub_type": "url"}
]'::jsonb,
updated_at = now()
WHERE trigger_key = 'objeto_postado';