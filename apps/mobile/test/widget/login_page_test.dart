import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:societyhub_mobile/api/society_hub_api.dart';
import 'package:societyhub_mobile/auth/session.dart';
import 'package:societyhub_mobile/core/app_keys.dart';
import 'package:societyhub_mobile/features/auth/presentation/login_page.dart';

import '../helpers/test_harness.dart';

void attachApi(WidgetTester tester, SocietyHubApi api) {
  final element = tester.element(find.byType(LoginPage));
  ProviderScope.containerOf(element).read(sessionProvider.notifier).replaceApiForTest(api);
}

void main() {
  testWidgets('shows password fields by default and switches modes', (tester) async {
    await tester.pumpWidget(wrapForWidgetTest(child: const LoginPage()));
    await tester.pumpAndSettle();

    expect(find.byKey(AppKeys.loginEmail), findsOneWidget);
    expect(find.byKey(AppKeys.loginPassword), findsOneWidget);
    expect(find.text('SocietyHub'), findsWidgets);

    await tester.tap(find.byKey(AppKeys.loginModeOtp));
    await tester.pumpAndSettle();
    expect(find.byKey(AppKeys.loginPhone), findsOneWidget);
    expect(find.text('Send OTP'), findsOneWidget);

    await tester.tap(find.byKey(AppKeys.loginModePin));
    await tester.pumpAndSettle();
    expect(find.byKey(AppKeys.loginPin), findsOneWidget);
  });

  testWidgets('password login success navigates to select-society', (tester) async {
    final bundle = MockApiBundle();
    bundle.adapter.onPost(
      '/v1/auth/password/login',
      (server) => server.reply(200, loginJson(fixtureUser())),
      data: Matchers.any,
    );

    final router = GoRouter(
      initialLocation: '/login',
      routes: [
        GoRoute(path: '/login', builder: (_, _) => const LoginPage()),
        GoRoute(
          path: '/select-society',
          builder: (_, _) => const Scaffold(body: Text('SELECT_SOCIETY')),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: testSessionOverrides(),
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();
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

    await tester.pumpWidget(wrapForWidgetTest(child: const LoginPage()));
    await tester.pumpAndSettle();
    attachApi(tester, bundle.api);

    await tester.enterText(find.byKey(AppKeys.loginEmail), 'a@b.com');
    await tester.enterText(find.byKey(AppKeys.loginPassword), 'bad');
    await tester.tap(find.byKey(AppKeys.loginSubmit));
    await tester.pumpAndSettle();

    expect(find.byKey(AppKeys.loginError), findsOneWidget);
    expect(find.text('Invalid email or password'), findsOneWidget);
  });
}
