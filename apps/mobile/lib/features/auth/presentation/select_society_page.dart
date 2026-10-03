import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/models.dart';
import '../../../auth/memberships.dart';
import '../../../auth/session.dart';
import '../../../core/app_keys.dart';
import '../../../core/theme.dart';
import '../../../shared/widgets.dart';

String _roleLabel(String role) {
  return switch (role) {
    'superadmin' => 'Platform',
    'chairperson' => 'Chairperson',
    'admin' => 'Admin',
    'secretary' => 'Secretary',
    'treasurer' => 'Treasurer',
    'cashier' => 'Cashier',
    'committee' => 'Committee',
    'tenant' => 'Tenant',
    _ => 'Resident',
  };
}

String _societyInitial(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) return 'S';
  return trimmed[0].toUpperCase();
}

class SelectSocietyPage extends ConsumerStatefulWidget {
  const SelectSocietyPage({super.key});

  @override
  ConsumerState<SelectSocietyPage> createState() => _SelectSocietyPageState();
}

class _SelectSocietyPageState extends ConsumerState<SelectSocietyPage> {
  List<MembershipDto>? _memberships;
  String? _busyTenant;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final rows = await ref.read(apiProvider).listMemberships();
      final unique = uniqueMembershipsBySociety(rows);
      if (!mounted) return;
      if (unique.length <= 1) {
        context.go('/home/dashboard');
        return;
      }
      setState(() => _memberships = unique);
    } catch (_) {
      if (!mounted) return;
      context.go('/home/dashboard');
    }
  }

  Future<void> _pick(String tenantId) async {
    setState(() {
      _busyTenant = tenantId;
      _error = null;
    });
    try {
      final res = await ref.read(apiProvider).selectTenant(tenantId);
      await ref.read(sessionProvider.notifier).setSession(res.user, res.tokens);
      if (!mounted) return;
      context.go('/home/dashboard');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busyTenant = null);
    }
  }

  Future<void> _logout() async {
    await ref.read(sessionProvider.notifier).clearSession();
    if (!mounted) return;
    context.go('/welcome');
  }

  @override
  Widget build(BuildContext context) {
    final count = _memberships?.length ?? 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF3F0EB),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
              child: Row(
                children: [
                  const SocietyHubLogo(size: 36),
                  const SizedBox(width: 10),
                  Text(
                    'SocietyHub',
                    style: displayStyle(size: 20).copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    key: AppKeys.selectSocietyLogout,
                    onPressed: _busyTenant != null ? null : _logout,
                    child: const Text('Log out'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 440),
                    child: Column(
                      children: [
                        const SocietyHubLogo(size: 52),
                        const SizedBox(height: 16),
                        Text(
                          'Choose your society',
                          style: displayStyle(size: 26).copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          count > 0
                              ? 'You belong to $count societies. Pick one to continue.'
                              : 'You belong to more than one society. Pick one to continue.',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.black54,
                            height: 1.35,
                          ),
                        ),
                        const SizedBox(height: 24),
                        if (_memberships == null)
                          const ShCard(
                            child: Padding(
                              padding: EdgeInsets.symmetric(vertical: 20),
                              child: Center(child: CircularProgressIndicator()),
                            ),
                          )
                        else
                          Column(
                            children: [
                              for (final m in _memberships!) ...[
                                _SocietyChoiceCard(
                                  membership: m,
                                  busy: _busyTenant == m.tenantId,
                                  enabled: _busyTenant == null,
                                  onTap: () => _pick(m.tenantId),
                                ),
                                const SizedBox(height: 12),
                              ],
                            ],
                          ),
                        if (_error != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: AppColors.danger),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SocietyChoiceCard extends StatelessWidget {
  const _SocietyChoiceCard({
    required this.membership,
    required this.busy,
    required this.enabled,
    required this.onTap,
  });

  final MembershipDto membership;
  final bool busy;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final subtitle = [
      _roleLabel(membership.role),
      if (membership.canUseAdminMode) 'Admin access',
    ].join(' · ');

    return Material(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.black.withValues(alpha: 0.06)),
      ),
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [AppColors.saffron, AppColors.leafDark],
                  ),
                ),
                child: Text(
                  _societyInitial(membership.societyName),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      membership.societyName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.black.withValues(alpha: 0.45),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: busy ? Colors.black.withValues(alpha: 0.04) : AppColors.mist,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  busy ? 'Opening…' : 'Continue',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: busy ? Colors.black45 : AppColors.leafDark,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
