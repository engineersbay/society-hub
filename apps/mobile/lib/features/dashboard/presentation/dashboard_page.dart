import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/models.dart';
import '../../../auth/session.dart';
import '../../../core/theme.dart';
import '../../../shared/complaint_ui.dart';
import '../../../shared/widgets.dart';

class DashboardPage extends ConsumerStatefulWidget {
  const DashboardPage({super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage> {
  DashboardStatsDto? _stats;
  List<ComplaintDto> _recent = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = ref.read(apiProvider);
    final staffView = ref.read(sessionProvider.notifier).isStaffView;
    try {
      final stats = await api.getDashboardStats(mine: !staffView);
      if (mounted) setState(() => _stats = stats);
    } catch (_) {}
    try {
      final list = await api.listComplaints(page: 1, limit: 4, mine: !staffView);
      if (mounted) setState(() => _recent = list.items);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final user = session.user;
    final staffView = ref.watch(sessionProvider.notifier).isStaffView;
    ref.listen(sessionProvider, (prev, next) {
      if (prev?.mode != next.mode) {
        _load();
      }
    });
    final firstName = user?.name?.split(' ').first;
    final viewLine = staffView
        ? 'Admin view · society overview'
        : user?.flatNumber != null
            ? 'Resident view · Flat ${user!.flatNumber}'
            : 'Resident view';

    final quickActions = staffView
        ? const [
            _QuickAction(
              path: '/home/residents',
              title: 'Add resident',
              subtitle: 'Onboard a household',
              icon: Icons.person_add_alt_1_outlined,
            ),
            _QuickAction(
              path: '/home/bills',
              title: 'Bills',
              subtitle: 'Generate or review dues',
              icon: Icons.receipt_long_outlined,
            ),
            _QuickAction(
              path: '/home/notices',
              title: 'Notices',
              subtitle: 'Publish an update',
              icon: Icons.campaign_outlined,
            ),
            _QuickAction(
              path: '/home/visitors',
              title: 'Visitors',
              subtitle: 'Gate passes & entries',
              icon: Icons.badge_outlined,
            ),
          ]
        : const [
            _QuickAction(
              path: '/home/bills',
              title: 'Pay dues',
              subtitle: 'See outstanding bills',
              icon: Icons.payments_outlined,
            ),
            _QuickAction(
              path: '/home/bookings',
              title: 'Book clubhouse',
              subtitle: 'Reserve an amenity',
              icon: Icons.event_available_outlined,
            ),
            _QuickAction(
              path: '/home/visitors',
              title: 'Expect visitor',
              subtitle: 'Create a digital pass',
              icon: Icons.person_outline,
            ),
            _QuickAction(
              path: '/home/parking',
              title: 'Parking',
              subtitle: 'Slots and vehicles',
              icon: Icons.local_parking_outlined,
            ),
          ];

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          Text(
            viewLine.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.4,
              color: AppColors.gold,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      firstName == null ? 'Hello' : 'Hello, $firstName',
                      style: displayStyle(size: 28),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      staffView
                          ? 'What needs attention across the society today.'
                          : 'Bills, complaints, and updates for your flat.',
                      style: const TextStyle(color: Colors.black54, height: 1.35),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              FilledButton.tonal(
                onPressed: () => context.push('/home/complaints/new'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.saffron,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                child: const Text('Raise'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'Dues',
                  value: _stats == null
                      ? '—'
                      : formatRupees(_stats!.duesOutstandingPaise),
                  icon: Icons.receipt_long_outlined,
                  valueColor: AppColors.danger,
                  onTap: () => context.go('/home/bills'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatCard(
                  label: 'Complaints',
                  value: _stats?.openComplaints.toString() ?? '—',
                  icon: Icons.report_problem_outlined,
                  onTap: () => context.go('/home/complaints'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatCard(
                  label: 'Notices',
                  value: _stats?.publishedNotices.toString() ?? '—',
                  icon: Icons.campaign_outlined,
                  onTap: () => context.go('/home/notices'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          Text(
            'Quick actions',
            style: displayStyle(size: 18).copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            staffView ? 'Common society admin tasks' : 'Everyday flat tasks',
            style: TextStyle(color: Colors.black.withValues(alpha: 0.45), fontSize: 13),
          ),
          const SizedBox(height: 12),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.55,
            children: [
              for (final action in quickActions)
                _QuickActionCard(
                  action: action,
                  onTap: () => context.go(action.path),
                ),
            ],
          ),
          const SizedBox(height: 22),
          ShCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            staffView
                                ? 'Recent complaints'
                                : 'Your recent complaints',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          Text(
                            staffView
                                ? 'Latest across the society'
                                : 'Latest from your flat',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.black.withValues(alpha: 0.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => context.go('/home/complaints'),
                      child: const Text('View all'),
                    ),
                  ],
                ),
                if (_recent.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: EmptyState(
                      message: 'No complaints yet.',
                      icon: Icons.report_problem_outlined,
                    ),
                  )
                else
                  ..._recent.map(
                    (c) => ComplaintListTile(
                      complaint: c,
                      onTap: () => context.push('/home/complaints/${c.id}'),
                    ),
                  ),
                const SizedBox(height: 8),
                ShPrimaryButton(
                  label: 'Raise complaint',
                  onPressed: () => context.push('/home/complaints/new'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickAction {
  const _QuickAction({
    required this.path,
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  final String path;
  final String title;
  final String subtitle;
  final IconData icon;
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({required this.action, required this.onTap});

  final _QuickAction action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.black.withValues(alpha: 0.06)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.saffron.withValues(alpha: 0.18),
                      AppColors.leafDark.withValues(alpha: 0.12),
                    ],
                  ),
                ),
                child: Icon(action.icon, size: 20, color: AppColors.leafDark),
              ),
              const Spacer(),
              Text(
                action.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: AppColors.ink,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                action.subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.black.withValues(alpha: 0.45),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.onTap,
    this.valueColor,
  });

  final String label;
  final String value;
  final IconData icon;
  final VoidCallback onTap;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.black.withValues(alpha: 0.06)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 18, color: AppColors.leafDark),
              const SizedBox(height: 10),
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: Colors.black.withValues(alpha: 0.4),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: valueColor ?? AppColors.leafDark,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
