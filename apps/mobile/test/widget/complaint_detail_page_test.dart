import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:societyhub_mobile/auth/session.dart';
import 'package:societyhub_mobile/core/app_keys.dart';
import 'package:societyhub_mobile/features/complaints/presentation/complaints_pages.dart';

import '../helpers/test_harness.dart';

void main() {
  testWidgets('staff detail shows office actions and acknowledges',
      (tester) async {
    final bundle = MockApiBundle();
    bundle.adapter
      ..onGet(
        '/v1/complaints/c1',
        (server) => server.reply(200, complaintJson()),
      )
      ..onPatch(
        '/v1/complaints/c1/status',
        (server) => server.reply(
          200,
          complaintJson(status: 'assigned', queueHint: null, queuePosition: null),
        ),
        data: Matchers.any,
      );

    final container = ProviderContainer(overrides: testSessionOverrides());
    addTearDown(container.dispose);
    await container.read(sessionProvider.notifier).setSession(
          fixtureUser(role: 'chairperson'),
          fixtureTokens(),
        );
    container.read(sessionProvider.notifier).setMode(AppMode.admin);
    container.read(sessionProvider.notifier).replaceApiForTest(bundle.api);

    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (_, _) => const ComplaintDetailPage(id: 'c1'),
        ),
        GoRoute(
          path: '/home/complaints',
          builder: (_, _) => const Scaffold(body: Text('LIST')),
        ),
      ],
    );

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(AppKeys.complaintStaffActions), findsOneWidget);
    expect(find.text('In queue'), findsOneWidget);

    await tester.tap(find.byKey(AppKeys.complaintAck));
    await tester.pumpAndSettle();

    expect(find.text('Acknowledged'), findsWidgets);
  });

  testWidgets('close without note shows validation error', (tester) async {
    final bundle = MockApiBundle();
    bundle.adapter.onGet(
      '/v1/complaints/c1',
      (server) => server.reply(200, complaintJson(status: 'in_progress')),
    );

    final container = ProviderContainer(overrides: testSessionOverrides());
    addTearDown(container.dispose);
    await container.read(sessionProvider.notifier).setSession(
          fixtureUser(role: 'chairperson'),
          fixtureTokens(),
        );
    container.read(sessionProvider.notifier).setMode(AppMode.admin);
    container.read(sessionProvider.notifier).replaceApiForTest(bundle.api);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: ComplaintDetailPage(id: 'c1'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(AppKeys.complaintClose));
    await tester.pumpAndSettle();

    expect(
      find.text('Add a short closing comment before resolving or closing.'),
      findsOneWidget,
    );
  });

  testWidgets('justCreated banner shows ticket and queue hint', (tester) async {
    final bundle = MockApiBundle();
    bundle.adapter.onGet(
      '/v1/complaints/c1',
      (server) => server.reply(200, complaintJson()),
    );

    final container = ProviderContainer(overrides: testSessionOverrides());
    addTearDown(container.dispose);
    await container.read(sessionProvider.notifier).setSession(
          fixtureUser(role: 'resident', flatNumber: '101'),
          fixtureTokens(),
        );
    container.read(sessionProvider.notifier).setMode(AppMode.resident);
    container.read(sessionProvider.notifier).replaceApiForTest(bundle.api);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: ComplaintDetailPage(id: 'c1', justCreated: true),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(AppKeys.complaintCreatedBanner), findsOneWidget);
    expect(find.byKey(AppKeys.complaintQueueHint), findsOneWidget);
    expect(find.byKey(AppKeys.complaintStaffActions), findsNothing);
  });
}
