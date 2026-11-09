// Stand-ins for HTTP responses. authenticated and mediaVerified stay false.
// Nothing here is a captured Synento session or a completed login.

export function classify(status, bodyText, wwwAuthenticate = '') {
  let kind = 'transport_error'
  if (status === 401) {
    const header = wwwAuthenticate.toLowerCase()
    const body = bodyText.toLowerCase()
    kind =
      header.includes('invalid_token') || body.includes('invalid_token') || body.includes('revoked')
        ? 'reauth_required'
        : 'oauth_required'
  } else if (status === 403 && bodyText.toLowerCase().includes('insufficient_scope')) {
    kind = 'consent_required'
  }
  return {
    authenticated: false,
    kind,
    mediaVerified: false,
    status,
  }
}
