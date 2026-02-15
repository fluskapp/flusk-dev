export interface FieldDefinition {
  name: string;
  type: 'String' | 'Integer' | 'Number' | 'Boolean' | 'UUID' | 'Date' | 'Email';
  required: boolean;
  unique: boolean;
  description?: string;
}

export interface EntityDefinition {
  name: string;
  fields: FieldDefinition[];
}
