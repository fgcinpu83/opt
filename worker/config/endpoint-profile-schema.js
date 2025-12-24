/**
 * Endpoint Profile Schema Validation
 * Validates PUBLIC and PRIVATE endpoint profiles with conditional rate_limit requirements
 */

const Joi = require('joi');

// Default rate limit for PUBLIC profiles
const DEFAULT_PUBLIC_RATE_LIMIT = {
  requests_per_minute: 30,
  burst: 5,
  enforced: false
};

// Rate limit sub-schema
const rateLimitSchema = Joi.object({
  requests_per_minute: Joi.number().integer().min(1).required(),
  burst: Joi.number().integer().min(1).required(),
  enforced: Joi.boolean().required()
});

// Base endpoint profile schema
const endpointProfileSchema = Joi.object({
  profile_type: Joi.string().valid('PUBLIC', 'PRIVATE').required(),
  endpoint_url: Joi.string().uri().required(),
  method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH').default('GET'),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  auth_required: Joi.boolean().default(false),
  timeout_ms: Joi.number().integer().min(100).default(5000),
  retry_attempts: Joi.number().integer().min(0).max(5).default(3),
  description: Joi.string().optional(),
  created_at: Joi.date().iso().default(() => new Date()),
  updated_at: Joi.date().iso().default(() => new Date())
}).when(Joi.object({ profile_type: Joi.valid('PUBLIC') }).unknown(), {
  then: Joi.object({
    // For PUBLIC profiles: rate_limit is optional with default
    rate_limit: rateLimitSchema.optional().default(DEFAULT_PUBLIC_RATE_LIMIT)
  }),
  otherwise: Joi.object({
    // For PRIVATE profiles: rate_limit is required
    rate_limit: rateLimitSchema.required()
  })
});

/**
 * Validate endpoint profile
 * @param {Object} profile - The endpoint profile to validate
 * @returns {Object} Validated profile with defaults applied
 * @throws {Error} Validation error if profile is invalid
 */
function validateEndpointProfile(profile) {
  const { error, value } = endpointProfileSchema.validate(profile, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Endpoint profile validation failed: ${errorMessage}`);
  }

  return value;
}

/**
 * Validate multiple endpoint profiles
 * @param {Array} profiles - Array of endpoint profiles to validate
 * @returns {Array} Array of validated profiles with defaults applied
 * @throws {Error} Validation error if any profile is invalid
 */
function validateEndpointProfiles(profiles) {
  if (!Array.isArray(profiles)) {
    throw new Error('Profiles must be an array');
  }

  return profiles.map((profile, index) => {
    try {
      return validateEndpointProfile(profile);
    } catch (error) {
      throw new Error(`Profile at index ${index}: ${error.message}`);
    }
  });
}

module.exports = {
  endpointProfileSchema,
  rateLimitSchema,
  validateEndpointProfile,
  validateEndpointProfiles,
  DEFAULT_PUBLIC_RATE_LIMIT
};
