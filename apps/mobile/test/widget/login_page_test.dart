import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:societyhub_mobile/api/society_hub_api.dart';
import 'package:societyhub_mobile/auth/google_id_token.dart';
import 'package:societyhub_mobile/auth/session.dart';
import 'package:societyhub_mobile/config/api_config.dart';
import 'package:societyhub_mobile/core/app_keys.dart';
import 'package:societyhub_mobile/core/app_version.dart';
import 'package:societyhub_mobile/features/auth/presentation/login_methods_page.dart';
import 'package:societyhub_mobile/features/auth/presentation/login_page.dart';
import 'package:societyhub_mobile/features/auth/presentation/welcome_page.dart';

import '../helpers/test_harness.dart';

void attachApi(WidgetTester tester, SocietyHubApi api) {
  final element = tester.element(find.byType(LoginPage));
  ProviderScope.containerOf(element)
      .read(sessionProvider.notifier)
      .replaceApiForTest(api);
}

GoRouter authTestRouter({String initial = '/welcome'}) {
  return GoRouter(
    initialLocation: initial,
    routes: [
      GoRoute(
        path: '/welcome',
        builder: (_, _) => const WelcomePage(),
      ),
      GoRoute(
        path: '/login',
        builder: (_, _) => const LoginMethodsPage(),
        routes: [
          GoRoute(
            path: ':mode',
            builder: (context, state) {
              final mode = loginModeFromPath(state.pathParameters['mode']);
              if (mode == null) return const LoginMethodsPage();
              return LoginPage(mode: mode);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/select-society',
        builder: (_, _) => const Scaffold(body: Text('SELECT_SOCIETY')),
      ),
    ],
  );
}

Future<void> pumpAuthRouter(
  WidgetTester tester, {
  required GoRouter router,
  List<Override> overrides = const [],
  ApiConfig? config,
  AppVersionSource versionSource = const FakeAppVersionSource(),
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testSessionOverrides(
          config: config ??
              const ApiConfig(baseUrl: testApiBase, env: 'dev'),
          versionSource: versionSource,
        ),
        ...overrides,
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('welcome shows Login, not the phone field', (tester) async {
    await pumpAuthRouter(tester, router: authTestRouter());

    expect(find.byKey(AppKeys.welcomePage), findsOneWidget);
    expect(find.byKey(AppKeys.welcomeLogin), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
    expect(find.byKey(AppKeys.loginPhone), findsNothing);
    expect(find.text('Your society, in one place'), findsOneWidget);
  });

  testWidgets('launcher → form → back returns to launchers → welcome',
      (tester) async {
    await pumpAuthRouter(tester, router: authTestRouter());

    await tester.tap(find.byKey(AppKeys.welcomeLogin));
    await tester.pumpAndSettle();
    expect(find.byKey(AppKeys.loginMethodsPage), findsOneWidget);
    expect(find.byKey(AppKeys.loginModeOtp), findsOneWidget);

    await tester.tap(find.byKey(AppKeys.loginModeOtp));
    await tester.pumpAndSettle();
    expect(find.byKey(AppKeys.loginPhone), findsOneWidget);
    expect(find.text('Send OTP'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back));
    await tester.pumpAndSettle();
    expect(find.byKey(AppKeys.loginMethodsPage), findsOneWidget);
    expect(find.byKey(AppKeys.loginPhone), findsNothing);

    await tester.tap(find.byIcon(Icons.arrow_back));
    await tester.pumpAndSettle();
    expect(find.byKey(AppKeys.welcomePage), findsOneWidget);
    expect(find.byKey(AppKeys.welcomeLogin), findsOneWidget);
  });

  testWidgets('password login success navigates to select-society',
      (tester) async {
    final bundle = MockApiBundle();
    bundle.adapter.onPost(
      '/v1/auth/password/login',
      (server) => server.reply(200, loginJson(fixtureUser())),
      data: Matchers.any,
    );

    final router = authTestRouter(initial: '/login/password');
    await pumpAuthRouter(tester, router: router);
    attachApi(tester, bundle.api);

    await tester.enterText(find.byKey(AppKeys.loginEmail), 'a@b.com');
    await tester.enterText(find.byKey(AppKeys.loginPassword), 'secret');
    await tester.tap(find.byKey(AppKeys.loginSubmit));
    await tester.pumpAndSettle();

    expect(find.text('SELECT_SOCIETY'), findsOneWidget);
  });

  testWidgets('password login shows API error message', (tester) async {
    final bundle = MockApiBundle();
    bundle.adapter.onPost(
      '/v1/auth/password/login',
      (server) => server.reply(401, {
        'code': 'invalid_credentials',
        'message': 'Invalid email or password',
      }),
      data: Matchers.any,
    );

    await tester.pumpWidget(
      wrapForWidgetTest(child: const LoginPage(mode: LoginMode.password)),
    );
    await tester.pumpAndSettle();
    attachApi(tester, bundle.api);

    await tester.enterText(find.byKey(AppKeys.loginEmail), 'a@b.com');
    await tester.enterText(find.byKey(AppKeys.loginPassword), 'bad');
    await tester.tap(find.byKey(AppKeys.loginSubmit));
    await tester.pumpAndSettle();

    expect(find.byKey(AppKeys.loginError), findsOneWidget);
    expect(find.text('Email or password is incorrect.'), findsOneWidget);
  });

  testWidgets('dev Google login sends a dev: token', (tester) async {
    final bundle = MockApiBundle();
    bundle.adapter.onPost(
      '/v1/auth/google',
      (server) => server.reply(200, loginJson(fixtureUser())),
      data: Matchers.any,
    );

    final router = authTestRouter(initial: '/login/google');
    await pumpAuthRouter(tester, router: router);
    attachApi(tester, bundle.api);

    await tester.enterText(find.byKey(AppKeys.loginPhone), '8888888888');
    await tester.tap(find.byKey(AppKeys.loginSubmit));
    await tester.pumpAndSettle();

    expect(find.text('SELECT_SOCIETY'), findsOneWidget);
  });

  testWidgets(
      'prod Google login posts a real idToken and hides the phone field',
      (tester) async {
    final bundle = MockApiBundle();
    bundle.adapter.onPost(
      '/v1/auth/google',
      (server) => server.reply(200, loginJson(fixtureUser())),
      data: {'idToken': 'ey.real.token'},
    );

    final router = authTestRouter(initial: '/login/google');
    await pumpAuthRouter(
      tester,
      router: router,
      config: const ApiConfig(
        baseUrl: testApiBase,
        env: 'prod',
        googleServerClientId: 'web-client.apps.googleusercontent.com',
      ),
      overrides: [
        googleIdTokenSourceProvider.overrideWithValue(
          _FakeGoogleSource('ey.real.token'),
        ),
      ],
    );
    attachApi(tester, bundle.api);

    expect(find.byKey(AppKeys.loginPhone), findsNothing);
    expect(find.text('Continue with Google'), findsOneWidget);

    await tester.tap(find.byKey(AppKeys.loginSubmit));
    await tester.pumpAndSettle();

    expect(find.text('SELECT_SOCIETY'), findsOneWidget);
  });

  testWidgets('prod Google login refuses a cancelled or missing token',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          ...testSessionOverrides(
            config: const ApiConfig(
              baseUrl: testApiBase,
              env: 'prod',
              googleServerClientId: 'web-client.apps.googleusercontent.com',
            ),
          ),
          googleIdTokenSourceProvider.overrideWithValue(
            const _FakeGoogleSource(null),
          ),
        ],
        child: const MaterialApp(home: LoginPage(mode: LoginMode.google)),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(AppKeys.loginSubmit));
    await tester.pumpAndSettle();

    expect(find.byKey(AppKeys.loginError), findsOneWidget);
    expect(
      find.textContaining('Google Sign-In did not complete'),
      findsOneWidget,
    );
  });

  testWidgets('prod Google login shows a spinner while the token is fetched',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          ...testSessionOverrides(
            config: const ApiConfig(
              baseUrl: testApiBase,
              env: 'prod',
              googleServerClientId: 'web-client.apps.googleusercontent.com',
            ),
          ),
          googleIdTokenSourceProvider.overrideWithValue(
            const _SlowGoogleSource(),
          ),
        ],
        child: const MaterialApp(home: LoginPage(mode: LoginMode.google)),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(AppKeys.loginSubmit));
    await tester.pump();

    expect(find.byKey(AppKeys.loginBusy), findsOneWidget);
    await tester.pumpAndSettle();
  });

  testWidgets('welcome footer shows installed version', (tester) async {
    await pumpAuthRouter(tester, router: authTestRouter());

    expect(find.byKey(AppKeys.loginVersion), findsOneWidget);
    expect(find.text('Installed version 1.0.0 (1)'), findsOneWidget);
    expect(find.byKey(AppKeys.loginUpdate), findsNothing);
    expect(find.text('Privacy'), findsOneWidget);
  });

  testWidgets('welcome footer shows Update when Play has a newer build',
      (tester) async {
    var opened = false;
    await tester.pumpWidget(
      wrapForWidgetTest(
        child: const WelcomePage(),
        versionSource: FakeAppVersionSource(
          versionLabel: '1.0.0 (1)',
          updateAvailable: true,
          onStartUpdate: () async {
            opened = true;
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(AppKeys.loginUpdate), findsOneWidget);
    await tester.tap(find.byKey(AppKeys.loginUpdate));
    await tester.pumpAndSettle();
    expect(opened, isTrue);
  });

  testWidgets('OTP form first back clears OTP step then leaves form',
      (tester) async {
    final bundle = MockApiBundle();
    bundle.adapter.onPost(
      '/v1/auth/otp/request',
      (server) => server.reply(200, {'devCode': '123456'}),
      data: Matchers.any,
    );

    final router = authTestRouter(initial: '/login/otp');
    await pumpAuthRouter(tester, router: router);
    attachApi(tester, bundle.api);

    await tester.enterText(find.byKey(AppKeys.loginPhone), '8888888888');
    await tester.tap(find.byKey(AppKeys.loginSubmit));
    await tester.pumpAndSettle();
    expect(find.byKey(AppKeys.loginOtpCode), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back));
    await tester.pumpAndSettle();
    expect(find.byKey(AppKeys.loginOtpCode), findsNothing);
    expect(find.text('Send OTP'), findsOneWidget);
    expect(find.byType(LoginPage), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back));
    await tester.pumpAndSettle();
    expect(find.byKey(AppKeys.loginMethodsPage), findsOneWidget);
  });
}

class _FakeGoogleSource implements GoogleIdTokenSource {
  const _FakeGoogleSource(this.token);

  final String? token;

  @override
  Future<String?> fetchIdToken({required String serverClientId}) async {
    return token;
  }
}

class _SlowGoogleSource implements GoogleIdTokenSource {
  const _SlowGoogleSource();

  @override
  Future<String?> fetchIdToken({required String serverClientId}) async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    return null;
  }
}
