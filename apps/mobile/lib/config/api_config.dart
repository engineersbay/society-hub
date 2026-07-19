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
  });

  final String baseUrl;
  final String env;

  bool get isDev => env == 'dev';

  static ApiConfig fromEnvironment() {
    const baseUrl = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3000',
    );
    const env = String.fromEnvironment('ENV', defaultValue: 'dev');
    return const ApiConfig(baseUrl: baseUrl, env: env);
  }
}
