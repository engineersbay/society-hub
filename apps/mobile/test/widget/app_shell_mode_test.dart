import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:societyhub_mobile/auth/session.dart';
import 'package:societyhub_mobile/core/app_keys.dart';
import 'package:societyhub_mobile/features/shell/presentation/app_shell.dart';

import '../helpers/test_harness.dart';

Future<void> pumpShell(
  WidgetTester tester, {
  required UserRoleSeed seed,
  String location = '/home/dashboard',
}) async {
  final container = ProviderContainer(overrides: testSessionOverrides());
  addTearDown(container.dispose);
  await container.read(sessionProvider.notifier).setSession(
        fixtureUser(role: seed.role, name: seed.name, flatNumber: seed.flat),
        fixtureTokens(),
      );
  container.read(sessionProvider.notifier).setMode(seed.mode);

  final router = GoRouter(
    initialLocation: location,
    routes: [
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/home/dashboard',
            builder: (_, _) => const Text('DASHBOARD'),
          ),
          GoRoute(
            path: '/home/bills',
            builder: (_, _) => const Text('BILLS'),
          ),
          GoRoute(
            path: '/home/complaints',
            builder: (_, _) => const Text('COMPLAINTS_LIST'),
          ),
          GoRoute(
            path: '/home/complaints/:id',
            builder: (_, state) =>
                Text('DETAIL:${state.pathParameters['id']}'),
          ),
          GoRoute(
            path: '/home/account',
            builder: (_, _) => const Text('ACCOUNT'),
          ),
        ],
      ),
    ],
  );

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(
        theme: ThemeData(useMaterial3: true),
        routerConfig: router,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

class UserRoleSeed {
  const UserRoleSeed({
    required this.role,
    this.mode = AppMode.admin,
    this.name = 'Demo',
    this.flat,
  });
  final String role;
  final AppMode mode;
  final String name;
  final String? flat;
}

void main() {
  testWidgets('chairperson sees Admin/Resident toggle', (tester) async {
    await pumpShell(
      tester,
      seed: const UserRoleSeed(role: 'chairperson'),
    );

    final scaffold = tester.state<ScaffoldState>(find.byType(Scaffold));
    scaffold.openDrawer();
    await tester.pumpAndSettle();

    expect(find.byKey(AppKeys.modeToggle), findsOneWidget);
    expect(find.byKey(AppKeys.modeAdmin), findsOneWidget);
    expect(find.byKey(AppKeys.modeResident), findsOneWidget);
    expect(find.text('Residents'), findsOneWidget);
  });

  testWidgets('switching to Resident hides admin-only nav', (tester) async {
    await pumpShell(
      tester,
      seed: const UserRoleSeed(role: 'chairperson'),
    );

    tester.state<ScaffoldState>(find.byType(Scaffold)).openDrawer();
    await tester.pumpAndSettle();
    expect(find.text('Residents'), findsOneWidget);

    await tester.tap(find.byKey(AppKeys.modeResident));
    await tester.pumpAndSettle();

    expect(find.text('Residents'), findsNothing);
    expect(find.text('Complaints'), findsOneWidget);
  });

  testWidgets('pure resident never sees mode toggle', (tester) async {
    await pumpShell(
      tester,
      seed: const UserRoleSeed(
        role: 'resident',
        mode: AppMode.resident,
        flat: '101',
      ),
    );

    tester.state<ScaffoldState>(find.byType(Scaffold)).openDrawer();
    await tester.pumpAndSettle();

    expect(find.byKey(AppKeys.modeToggle), findsNothing);
    expect(find.text('Residents'), findsNothing);
    expect(find.text('Complaints'), findsOneWidget);
  });

  testWidgets('shell back from Bills (go) returns to Dashboard', (tester) async {
    await pumpShell(
      tester,
      seed: const UserRoleSeed(role: 'resident', mode: AppMode.resident),
      location: '/home/bills',
    );

    expect(find.text('BILLS'), findsOneWidget);
    expect(find.text('Bills'), findsOneWidget);
    expect(find.byIcon(Icons.arrow_back), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back));
    await tester.pumpAndSettle();

    expect(find.text('DASHBOARD'), findsOneWidget);
    expect(find.text('Dashboard'), findsOneWidget);
  });

  testWidgets('shell back from pushed complaint detail returns to list',
      (tester) async {
    await pumpShell(
      tester,
      seed: const UserRoleSeed(role: 'resident', mode: AppMode.resident),
      location: '/home/complaints',
    );

    expect(find.text('COMPLAINTS_LIST'), findsOneWidget);

    final ctx = tester.element(find.text('COMPLAINTS_LIST'));
    GoRouter.of(ctx).push('/home/complaints/c1');
    await tester.pumpAndSettle();

    expect(find.text('DETAIL:c1'), findsOneWidget);
    expect(find.text('Complaint'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back));
    await tester.pumpAndSettle();

    expect(find.text('COMPLAINTS_LIST'), findsOneWidget);
    expect(find.text('Complaints'), findsOneWidget);
  });
}
