const emailVariables = {
  "{{ number }}": "Invoice number",
  "{{ link }}": "Link to online version",
  "{{ amount }}": "Invoice amount",
  "{{ client.first_name }}": "Client's first name",
  "{{ client.last_name }}": "Client's last name",
  "{{ account.name }}": "My company name (Business Name)" ,
  "{{ user.name }}": "Shop owner's name",
  "{{ note }}": "Order note",
  "{{ email }}": "Order email id ",
  "{{ customer_email }}": "Customer's account email id",
  "{{ support_email }}": "Support email id"
};

// If you need just the variable names as an array
const variableNames = Object.keys(emailVariables);

// If you need just the descriptions as an array
const variableDescriptions = Object.values(emailVariables);

// Export for use in other files
export { emailVariables, variableNames, variableDescriptions };

// Or as default export
export default emailVariables;