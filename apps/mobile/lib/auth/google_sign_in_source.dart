import 'package:google_sign_in/google_sign_in.dart';

import 'google_id_token.dart';

/// Production Google Sign-In. Obtain an ID token for `POST /v1/auth/google`.
class GoogleSignInIdTokenSource implements GoogleIdTokenSource {
  const GoogleSignInIdTokenSource();

  @override
  Future<String?> fetchIdToken({required String serverClientId}) async {
    final signIn = GoogleSignIn(
      serverClientId: serverClientId.isEmpty ? null : serverClientId,
      scopes: const ['email', 'openid', 'profile'],
    );
    final account = await signIn.signIn();
    if (account == null) return null;
    final auth = await account.authentication;
    return auth.idToken;
  }
}
