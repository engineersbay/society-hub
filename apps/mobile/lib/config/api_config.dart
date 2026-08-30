/// Runtime API config via `--dart-define`.
///
/// Example:
/// ```bash
/// flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000 --dart-define=ENV=dev
/// ```
class ApiConfig {
  const ApiConfig({
    required this.baseUrl,
    required this.env,
    this.googleServerClientId = '',
    this.privacyPolicyUrl = '',
  });

  final String baseUrl;
  final String env;
  final String googleServerClientId;
  final String privacyPolicyUrl;

  bool get isDev => env == 'dev';

  /// Dev-only Google shortcut (`dev:<phone>`). Never true in staging/prod.
  bool get allowsDevGoogle => env == 'dev';

  static const defaultPrivacyPolicyUrl = 'https://app.societyhub.in/privacy';

  String get resolvedPrivacyPolicyUrl {
    final trimmed = privacyPolicyUrl.trim();
    return trimmed.isEmpty ? defaultPrivacyPolicyUrl : trimmed;
  }

  static ApiConfig fromEnvironment() {
    const baseUrl = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3000',
    );
    const env = String.fromEnvironment('ENV', defaultValue: 'dev');
    const googleServerClientId = String.fromEnvironment(
      'GOOGLE_SERVER_CLIENT_ID',
    );
    const privacyPolicyUrl = String.fromEnvironment('PRIVACY_POLICY_URL');
    return const ApiConfig(
      baseUrl: baseUrl,
      env: env,
      googleServerClientId: googleServerClientId,
      privacyPolicyUrl: privacyPolicyUrl,
    );
  }
}
