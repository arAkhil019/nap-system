/**
 * Volunteer data model definition
 */
export const volunteerFields = {
  NV_ID: {
    label: "Volunteer ID",
    required: true
  },
  firstName: {
    label: "First Name",
    required: true
  },
  lastName: {
    label: "Last Name", 
    required: true
  },
  email: {
    label: "Email",
    validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  },
  phone: {
    label: "Phone Number"
  },
  address: {
    label: "Address" 
  },
  city: {
    label: "City"
  },
  state: {
    label: "State"
  },
  zipCode: {
    label: "Zip Code" 
  },
  availability: {
    label: "Availability"
  },
  skills: {
    label: "Skills"
  }
};

// Export array of field names for easier iteration
export const dbFields = Object.keys(volunteerFields);