import 'package:flutter_test/flutter_test.dart';
import 'package:societyhub_mobile/api/models.dart';
import 'package:societyhub_mobile/auth/session.dart';

void main() {
  group('UserDto', () {
    test('parses auth user payload', () {
      final user = UserDto.fromJson({
        'id': 'u1',
        'phone': '8888888888',
        'email': null,
        'name': 'Demo Resident',
        'username': null,
        'role': 'resident',
        'tenantId': 't1',
        'flatId': 'f1',
        'flatNumber': '101',
        'hasPin': false,
      });
      expect(user.name, 'Demo Resident');
      expect(user.role, 'resident');
      expect(user.toJson()['tenantId'], 't1');
    });
  });

  group('LoginResult', () {
    test('parses tokens and optional memberships', () {
      final result = LoginResult.fromJson({
        'user': {
          'id': 'u1',
          'phone': '9999999999',
          'email': 'a@b.com',
          'name': 'Chair',
          'username': null,
          'role': 'chairperson',
          'tenantId': 't1',
          'flatId': null,
          'flatNumber': null,
          'hasPin': true,
        },
        'tokens': {
          'accessToken': 'a',
          'refreshToken': 'r',
          'expiresIn': 900,
        },
        'memberships': [
          {
            'tenantId': 't1',
            'societyName': 'Green Valley',
            'role': 'chairperson',
            'canUseAdminMode': true,
          },
        ],
      });
      expect(result.tokens.accessToken, 'a');
      expect(result.memberships, isNotNull);
      expect(result.memberships!.first.societyName, 'Green Valley');
    });
  });

  group('roles', () {
    test('admin mode allowed for society staff only', () {
      expect(canUseAdminMode('chairperson'), isTrue);
      expect(canUseAdminMode('resident'), isFalse);
      expect(isPlatformRole('superadmin'), isTrue);
      expect(allowedRoles.contains('tenant'), isTrue);
    });
  });

  group('ComplaintDto', () {
    test('parses list item', () {
      final c = ComplaintDto.fromJson({
        'id': 'c1',
        'ticketNumber': 'CMP-1',
        'title': 'Leak',
        'type': 'plumbing',
        'description': 'Kitchen',
        'status': 'open',
        'flatId': 'f1',
        'flatNumber': '101',
        'residentName': 'Demo',
        'createdAt': '2026-07-19T00:00:00.000Z',
      });
      expect(c.ticketNumber, 'CMP-1');
      expect(c.status, 'open');
    });
  });
}
