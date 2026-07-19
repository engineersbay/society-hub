import 'dart:async';

import 'package:dio/dio.dart';

import '../config/api_config.dart';
import 'models.dart';

// Public ctor names (getAccessToken, …) differ from private fields by design.
// ignore_for_file: prefer_initializing_formals

typedef TokenGetter = String? Function();
typedef TokensSaver = FutureOr<void> Function(AuthTokens tokens);
typedef SessionCleared = FutureOr<void> Function();

/// Dart mirror of `packages/sdk` — same `/v1` paths and payloads.
class SocietyHubApi {
  SocietyHubApi({
    required ApiConfig config,
    required TokenGetter getAccessToken,
    required TokenGetter getRefreshToken,
    required TokensSaver onTokens,
    required SessionCleared onSessionInvalid,
  })  : _getAccessToken = getAccessToken,
        _getRefreshToken = getRefreshToken,
        _onTokens = onTokens,
        _onSessionInvalid = onSessionInvalid,
        _dio = Dio(
          BaseOptions(
            baseUrl: config.baseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 30),
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          ),
        ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (options.extra['auth'] != false) {
            final token = _getAccessToken();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final status = error.response?.statusCode;
          final opts = error.requestOptions;
          final alreadyRetried = opts.extra['retried'] == true;
          if (status == 401 &&
              opts.extra['auth'] != false &&
              !alreadyRetried) {
            final refreshed = await _tryRefresh();
            if (refreshed != null) {
              opts.extra['retried'] = true;
              opts.headers['Authorization'] =
                  'Bearer ${refreshed.accessToken}';
              try {
                final clone = await _dio.fetch(opts);
                return handler.resolve(clone);
              } catch (e) {
                if (e is DioException) return handler.next(e);
                return handler.next(error);
              }
            }
            await _onSessionInvalid();
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio _dio;
  final TokenGetter _getAccessToken;
  final TokenGetter _getRefreshToken;
  final TokensSaver _onTokens;
  final SessionCleared _onSessionInvalid;
  Future<AuthTokens?>? _refreshInFlight;

  Future<AuthTokens?> _tryRefresh() {
    return _refreshInFlight ??= () async {
      try {
        final refresh = _getRefreshToken();
        if (refresh == null || refresh.isEmpty) return null;
        final tokens = await refreshTokens(refresh);
        await _onTokens(tokens);
        return tokens;
      } catch (_) {
        return null;
      } finally {
        _refreshInFlight = null;
      }
    }();
  }

  Future<T> _request<T>(
    String path, {
    String method = 'GET',
    Object? data,
    bool auth = true,
    required T Function(dynamic json) parse,
  }) async {
    try {
      final res = await _dio.request<dynamic>(
        path,
        data: data,
        options: Options(
          method: method,
          extra: {'auth': auth},
        ),
      );
      if (res.statusCode == 204 || res.data == null) {
        return parse(null);
      }
      return parse(res.data);
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  ApiException _mapError(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      return ApiException(
        code: data['code'] as String? ?? 'http_error',
        message: data['message'] as String? ?? e.message ?? 'Request failed',
        statusCode: e.response?.statusCode,
        details: data['details'],
      );
    }
    return ApiException(
      code: 'http_error',
      message: e.message ?? 'Request failed',
      statusCode: e.response?.statusCode,
    );
  }

  Future<({bool ok, String? devCode})> requestOtp(String phone) {
    return _request(
      '/v1/auth/otp/request',
      method: 'POST',
      data: {'phone': phone},
      auth: false,
      parse: (json) {
        final map = json as Map<String, dynamic>;
        return (ok: true, devCode: map['devCode'] as String?);
      },
    );
  }

  Future<LoginResult> verifyOtp(String phone, String code) {
    return _request(
      '/v1/auth/otp/verify',
      method: 'POST',
      data: {'phone': phone, 'code': code},
      auth: false,
      parse: (json) => LoginResult.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<LoginResult> loginPassword(String email, String password) {
    return _request(
      '/v1/auth/password/login',
      method: 'POST',
      data: {'email': email, 'password': password},
      auth: false,
      parse: (json) => LoginResult.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<LoginResult> loginPin(String phone, String pin) {
    return _request(
      '/v1/auth/pin/login',
      method: 'POST',
      data: {'phone': phone, 'pin': pin},
      auth: false,
      parse: (json) => LoginResult.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<LoginResult> loginGoogle(String idToken) {
    return _request(
      '/v1/auth/google',
      method: 'POST',
      data: {'idToken': idToken},
      auth: false,
      parse: (json) => LoginResult.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<AuthTokens> refreshTokens(String refreshToken) {
    return _request(
      '/v1/auth/refresh',
      method: 'POST',
      data: {'refreshToken': refreshToken},
      auth: false,
      parse: (json) => AuthTokens.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<void> logout(String refreshToken) {
    return _request(
      '/v1/auth/logout',
      method: 'POST',
      data: {'refreshToken': refreshToken},
      parse: (_) {},
    );
  }

  Future<UserDto> me() {
    return _request(
      '/v1/auth/me',
      parse: (json) => UserDto.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<List<MembershipDto>> listMemberships() {
    return _request(
      '/v1/auth/memberships',
      parse: (json) => (json as List<dynamic>)
          .map((e) => MembershipDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<LoginResult> selectTenant(String tenantId) {
    return _request(
      '/v1/auth/select-tenant',
      method: 'POST',
      data: {'tenantId': tenantId},
      parse: (json) => LoginResult.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<void> setPin(String pin) {
    return _request(
      '/v1/auth/pin',
      method: 'POST',
      data: {'pin': pin},
      parse: (_) {},
    );
  }

  Future<PaginatedComplaints> listComplaints({int page = 1, int limit = 20}) {
    return _request(
      '/v1/complaints?page=$page&limit=$limit',
      parse: (json) =>
          PaginatedComplaints.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<ComplaintDto> getComplaint(String id) {
    return _request(
      '/v1/complaints/$id',
      parse: (json) => ComplaintDto.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<ComplaintDto> createComplaint({
    required String title,
    required String type,
    required String description,
    String? flatId,
    String? typeOtherText,
  }) {
    return _request(
      '/v1/complaints',
      method: 'POST',
      data: {
        'title': title,
        'type': type,
        'description': description,
        'flatId': ?flatId,
        'typeOtherText': ?typeOtherText,
      },
      parse: (json) => ComplaintDto.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<ComplaintDto> updateComplaintStatus(String id, String status) {
    return _request(
      '/v1/complaints/$id/status',
      method: 'PATCH',
      data: {'status': status},
      parse: (json) => ComplaintDto.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<DashboardStatsDto> getDashboardStats() {
    return _request(
      '/v1/dashboard/stats',
      parse: (json) =>
          DashboardStatsDto.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<List<FlatDto>> listFlats() {
    return _request(
      '/v1/admin/flats',
      parse: (json) => (json as List<dynamic>)
          .map((e) => FlatDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<UserDto> onboardResident({
    required String name,
    required String phone,
    required String flatId,
    String? email,
  }) {
    return _request(
      '/v1/admin/residents',
      method: 'POST',
      data: {
        'name': name,
        'phone': phone,
        'flatId': flatId,
        if (email != null && email.isNotEmpty) 'email': email,
      },
      parse: (json) {
        final map = json as Map<String, dynamic>;
        final user = map['user'] as Map<String, dynamic>? ?? map;
        return UserDto.fromJson(user);
      },
    );
  }
}
