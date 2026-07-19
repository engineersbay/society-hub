import 'package:flutter_test/flutter_test.dart';
import 'package:societyhub_mobile/auth/session.dart';

void main() {
  group('canUseAdminMode', () {
    test('allows society staff and platform superadmin', () {
      for (final role in [
        'superadmin',
        'chairperson',
        'admin',
        'secretary',
        'treasurer',
        'cashier',
        'committee',
      ]) {
        expect(canUseAdminMode(role), isTrue, reason: role);
      }
    });

    test('denies pure residents and null', () {
      expect(canUseAdminMode('resident'), isFalse);
      expect(canUseAdminMode('tenant'), isFalse);
      expect(canUseAdminMode(null), isFalse);
      expect(canUseAdminMode('unknown'), isFalse);
    });
  });

  group('isPlatformRole', () {
    test('only superadmin', () {
      expect(isPlatformRole('superadmin'), isTrue);
      expect(isPlatformRole('chairperson'), isFalse);
    });
  });

  group('allowedRoles', () {
    test('includes client-app roles from web auth', () {
      expect(allowedRoles.contains('chairperson'), isTrue);
      expect(allowedRoles.contains('resident'), isTrue);
      expect(allowedRoles.contains('guest'), isFalse);
    });
  });
}
