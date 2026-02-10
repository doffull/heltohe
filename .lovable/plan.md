

## Enable Leaked Password Protection

Leaked password protection (HaveIBeenPwned integration) will be enabled in the authentication configuration to prevent users from signing up or logging in with passwords that have appeared in known data breaches.

### Change

Update `supabase/config.toml` to add the leaked password protection setting under the `[auth]` section:

```toml
[auth.password]
min_length = 6
hibp_enabled = true
```

This is a single configuration change -- no code modifications are needed. The backend will automatically reject passwords found in the HaveIBeenPwned database during signup and password changes.

### Note
The `supabase/config.toml` file is auto-managed, so this setting will be applied by updating the auth configuration through the appropriate tool rather than editing the file directly.

