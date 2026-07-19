class ApiException implements Exception {
  ApiException({
    required this.code,
    required this.message,
    this.statusCode,
    this.details,
  });

  final String code;
  final String message;
  final int? statusCode;
  final Object? details;

  @override
  String toString() => message;
}

class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  final String accessToken;
  final String refreshToken;
  final int expiresIn;

  factory AuthTokens.fromJson(Map<String, dynamic> json) {
    return AuthTokens(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      expiresIn: (json['expiresIn'] as num).toInt(),
    );
  }
}

class UserDto {
  const UserDto({
    required this.id,
    required this.phone,
    required this.email,
    required this.name,
    required this.username,
    required this.role,
    required this.tenantId,
    required this.flatId,
    required this.flatNumber,
    required this.hasPin,
  });

  final String id;
  final String? phone;
  final String? email;
  final String? name;
  final String? username;
  final String role;
  final String tenantId;
  final String? flatId;
  final String? flatNumber;
  final bool hasPin;

  factory UserDto.fromJson(Map<String, dynamic> json) {
    return UserDto(
      id: json['id'] as String,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      name: json['name'] as String?,
      username: json['username'] as String?,
      role: json['role'] as String,
      tenantId: json['tenantId'] as String,
      flatId: json['flatId'] as String?,
      flatNumber: json['flatNumber'] as String?,
      hasPin: json['hasPin'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'phone': phone,
        'email': email,
        'name': name,
        'username': username,
        'role': role,
        'tenantId': tenantId,
        'flatId': flatId,
        'flatNumber': flatNumber,
        'hasPin': hasPin,
      };
}

class MembershipDto {
  const MembershipDto({
    required this.tenantId,
    required this.societyName,
    required this.role,
    required this.canUseAdminMode,
  });

  final String tenantId;
  final String societyName;
  final String role;
  final bool canUseAdminMode;

  factory MembershipDto.fromJson(Map<String, dynamic> json) {
    return MembershipDto(
      tenantId: json['tenantId'] as String,
      societyName: json['societyName'] as String,
      role: json['role'] as String,
      canUseAdminMode: json['canUseAdminMode'] as bool? ?? false,
    );
  }
}

class FlatDto {
  const FlatDto({
    required this.id,
    required this.number,
    required this.wingName,
  });

  final String id;
  final String number;
  final String? wingName;

  factory FlatDto.fromJson(Map<String, dynamic> json) {
    return FlatDto(
      id: json['id'] as String,
      number: json['number'] as String,
      wingName: json['wingName'] as String?,
    );
  }

  String get label {
    if (wingName == null || wingName!.isEmpty) return number;
    return '$wingName-$number';
  }
}

class ComplaintDto {
  const ComplaintDto({
    required this.id,
    required this.ticketNumber,
    required this.title,
    required this.type,
    required this.description,
    required this.status,
    required this.flatId,
    required this.flatNumber,
    required this.residentName,
    required this.createdAt,
  });

  final String id;
  final String ticketNumber;
  final String title;
  final String type;
  final String description;
  final String status;
  final String flatId;
  final String flatNumber;
  final String? residentName;
  final String createdAt;

  factory ComplaintDto.fromJson(Map<String, dynamic> json) {
    return ComplaintDto(
      id: json['id'] as String,
      ticketNumber: json['ticketNumber'] as String,
      title: json['title'] as String,
      type: json['type'] as String,
      description: json['description'] as String? ?? '',
      status: json['status'] as String,
      flatId: json['flatId'] as String? ?? '',
      flatNumber: json['flatNumber'] as String? ?? '',
      residentName: json['residentName'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class DashboardStatsDto {
  const DashboardStatsDto({
    required this.openComplaints,
    required this.totalComplaints,
    required this.duesOutstandingPaise,
    required this.upcomingBookings,
    required this.publishedNotices,
    required this.unreadNotifications,
  });

  final int openComplaints;
  final int totalComplaints;
  final int duesOutstandingPaise;
  final int upcomingBookings;
  final int publishedNotices;
  final int unreadNotifications;

  factory DashboardStatsDto.fromJson(Map<String, dynamic> json) {
    return DashboardStatsDto(
      openComplaints: (json['openComplaints'] as num?)?.toInt() ?? 0,
      totalComplaints: (json['totalComplaints'] as num?)?.toInt() ?? 0,
      duesOutstandingPaise:
          (json['duesOutstandingPaise'] as num?)?.toInt() ?? 0,
      upcomingBookings: (json['upcomingBookings'] as num?)?.toInt() ?? 0,
      publishedNotices: (json['publishedNotices'] as num?)?.toInt() ?? 0,
      unreadNotifications:
          (json['unreadNotifications'] as num?)?.toInt() ?? 0,
    );
  }
}

class LoginResult {
  const LoginResult({
    required this.user,
    required this.tokens,
    this.memberships,
  });

  final UserDto user;
  final AuthTokens tokens;
  final List<MembershipDto>? memberships;

  factory LoginResult.fromJson(Map<String, dynamic> json) {
    final membershipsJson = json['memberships'] as List<dynamic>?;
    return LoginResult(
      user: UserDto.fromJson(json['user'] as Map<String, dynamic>),
      tokens: AuthTokens.fromJson(json['tokens'] as Map<String, dynamic>),
      memberships: membershipsJson
          ?.map((e) => MembershipDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class PaginatedComplaints {
  const PaginatedComplaints({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
  });

  final List<ComplaintDto> items;
  final int page;
  final int limit;
  final int total;

  factory PaginatedComplaints.fromJson(Map<String, dynamic> json) {
    final items = (json['items'] as List<dynamic>? ?? [])
        .map((e) => ComplaintDto.fromJson(e as Map<String, dynamic>))
        .toList();
    return PaginatedComplaints(
      items: items,
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? items.length,
    );
  }
}
