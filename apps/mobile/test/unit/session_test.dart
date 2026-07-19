import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:societyhub_mobile/api/models.dart';
import 'package:societyhub_mobile/auth/session.dart';

import '../helpers/test_harness.dart';

void main() {
  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
  });

  test('setSession stores tokens and defaults chairperson to admin mode', () async {
    final container = await createSeededContainer(
      user: fixtureUser(role: 'chairperson'),
    );
    final state = container.read(sessionProvider);
    expect(state.user?.role, 'chairperson');
    expect(state.mode, AppMode.admin);
    expect(state.loading, isFalse);
    expect(container.read(sessionProvider.notifier).isStaffView, isTrue);
  });

  test('setSession defaults resident to resident mode', () async {
    final container = await createSeededContainer(
      user: fixtureUser(role: 'resident', flatNumber: '101'),
      mode: AppMode.resident,
    );
    expect(container.read(sessionProvider).mode, AppMode.resident);
    expect(container.read(sessionProvider.notifier).isStaffView, isFalse);
  });

  test('setSession rejects disallowed roles', () async {
    final container = ProviderContainer(overrides: testSessionOverrides());
    addTearDown(container.dispose);
    await expectLater(
      container.read(sessionProvider.notifier).setSession(
            fixtureUser(role: 'hacker'),
            fixtureTokens(),
          ),
      throwsA(
        isA<ApiException>().having(
          (e) => e.code,
          'code',
          'role_not_allowed',
        ),
      ),
    );
    expect(container.read(sessionProvider).user, isNull);
  });

  test('chairperson can switch Admin ↔ Resident', () async {
    final container = await createSeededContainer(
      user: fixtureUser(role: 'chairperson'),
    );
    final session = container.read(sessionProvider.notifier);
    session.setMode(AppMode.resident);
    expect(container.read(sessionProvider).mode, AppMode.resident);
    expect(session.isStaffView, isFalse);
    session.setMode(AppMode.admin);
    expect(container.read(sessionProvider).mode, AppMode.admin);
    expect(session.isStaffView, isTrue);
  });

  test('pure resident cannot switch to admin mode', () async {
    final container = await createSeededContainer(
      user: fixtureUser(role: 'resident'),
      mode: AppMode.resident,
    );
    container.read(sessionProvider.notifier).setMode(AppMode.admin);
    expect(container.read(sessionProvider).mode, AppMode.resident);
  });

  test('clearSession wipes tokens and user', () async {
    final bundle = MockApiBundle();
    bundle.adapter.onPost(
      '/v1/auth/logout',
      (server) => server.reply(200, {'ok': true}),
      data: Matchers.any,
    );

    final container = await createSeededContainer(
      user: fixtureUser(),
      api: bundle.api,
    );
    await container.read(sessionProvider.notifier).clearSession();
    expect(container.read(sessionProvider).user, isNull);
    expect(container.read(sessionProvider.notifier).debugAccessToken, isNull);
  });
}
