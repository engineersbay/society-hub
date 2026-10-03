import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/session.dart';
import '../../../core/theme.dart';
import '../../../shared/widgets.dart';

/// Visitors list with issue/share pass (resident + staff) and revoke (staff).
class VisitorsPage extends ConsumerStatefulWidget {
  const VisitorsPage({super.key});

  @override
  ConsumerState<VisitorsPage> createState() => _VisitorsPageState();
}

class _VisitorsPageState extends ConsumerState<VisitorsPage> {
  List<Map<String, dynamic>> _rows = [];
  String? _error;
  bool _loading = true;
  bool _busy = false;
  Map<String, dynamic>? _issuedPass;

  bool get _isAdmin {
    final session = ref.read(sessionProvider);
    return canUseAdminMode(session.user?.role) && session.mode == AppMode.admin;
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await ref.read(apiProvider).listVisitors();
      setState(() {
        _rows = rows;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _createVisitor() async {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final purposeCtrl = TextEditingController();
    const purposes = ['Family visit', 'Delivery', 'Service', 'Guest stay'];
    var selectedPurpose = '';

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            16,
            20,
            16 + MediaQuery.viewInsetsOf(ctx).bottom,
          ),
          child: StatefulBuilder(
            builder: (ctx, setLocal) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.sand,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('Expect a guest', style: displayStyle(size: 22)),
                  const SizedBox(height: 4),
                  const Text(
                    'Add a phone number so you can share a QR + OTP pass.',
                    style: TextStyle(color: Colors.black54),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Visitor name'),
                    textCapitalization: TextCapitalization.words,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: phoneCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Phone',
                      hintText: 'Needed to share a pass',
                    ),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 16),
                  const ShFormLabel('Purpose'),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final p in purposes)
                        ShChoiceChip(
                          label: p,
                          selected: selectedPurpose == p,
                          onTap: () {
                            setLocal(() {
                              selectedPurpose = p;
                              purposeCtrl.text = p;
                            });
                          },
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: purposeCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Or type another purpose',
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(ctx, false),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton(
                          onPressed: () => Navigator.pop(ctx, true),
                          child: const Text('Save visitor'),
                        ),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),
        );
      },
    );
    if (ok != true || !mounted) return;
    if (nameCtrl.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiProvider).createVisitor(
            visitorName: nameCtrl.text.trim(),
            phone: phoneCtrl.text.trim().isEmpty ? null : phoneCtrl.text.trim(),
            purpose: purposeCtrl.text.trim().isEmpty
                ? null
                : purposeCtrl.text.trim(),
          );
      await _load();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _issuePass(String id) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await ref.read(apiProvider).issueVisitorPass(id);
      setState(() => _issuedPass = result);
      await _load();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _revoke(String id) async {
    setState(() => _busy = true);
    try {
      await ref.read(apiProvider).revokeVisitorPass(id);
      if (_issuedPass?['visitor'] is Map &&
          (_issuedPass!['visitor'] as Map)['id'] == id) {
        setState(() => _issuedPass = null);
      }
      await _load();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _visitStatus(Map<String, dynamic> row) {
    if (row['checkedOutAt'] != null) return 'Checked out';
    if (row['checkedInAt'] != null) return 'On site';
    return 'Expected';
  }

  Color _statusColor(String status) {
    return switch (status) {
      'On site' => const Color(0xFF6B5300),
      'Checked out' => Colors.black45,
      _ => AppColors.leaf,
    };
  }

  @override
  Widget build(BuildContext context) {
    final visitor = _issuedPass?['visitor'] as Map?;
    final otp = '${_issuedPass?['otp'] ?? ''}';
    final qr = '${_issuedPass?['qrPayload'] ?? ''}';
    final expires = '${_issuedPass?['expiresAt'] ?? ''}';
    final expectedCount =
        _rows.where((r) => _visitStatus(r) == 'Expected').length;
    final onSiteCount = _rows.where((r) => _visitStatus(r) == 'On site').length;

    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            Text(
              (_isAdmin ? 'Admin view · gate ops' : 'Resident view · guest passes')
                  .toUpperCase(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.3,
                color: AppColors.gold,
              ),
            ),
            const SizedBox(height: 6),
            Text('Visitors', style: displayStyle(size: 28)),
            const SizedBox(height: 4),
            Text(
              _isAdmin
                  ? 'Register guests, share passes, or check in at the gate.'
                  : 'Pre-register guests and share a QR + OTP pass.',
              style: const TextStyle(color: Colors.black54, height: 1.35),
            ),
            const SizedBox(height: 16),
            ShPrimaryButton(
              label: 'Expect a visitor',
              busy: _busy,
              onPressed: _createVisitor,
            ),
            if (_rows.isNotEmpty) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _MiniStat(label: 'Total', value: '${_rows.length}'),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _MiniStat(label: 'Expected', value: '$expectedCount'),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _MiniStat(label: 'On site', value: '$onSiteCount'),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 16),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  _error!,
                  style: const TextStyle(color: AppColors.danger),
                ),
              ),
            if (_issuedPass != null) ...[
              ShCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Pass ready to share', style: displayStyle(size: 18)),
                    const SizedBox(height: 8),
                    const Text(
                      'OTP and QR shown once. Resend issues a new code.',
                      style: TextStyle(color: Colors.black54, fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    if (qr.isNotEmpty)
                      Center(
                        child: Image.network(
                          'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${Uri.encodeComponent(qr)}',
                          width: 180,
                          height: 180,
                          errorBuilder: (_, _, _) => SelectableText(qr),
                        ),
                      ),
                    const SizedBox(height: 8),
                    Center(
                      child: Text(
                        otp,
                        style: displayStyle(size: 32).copyWith(letterSpacing: 6),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Valid until $expires',
                      style: const TextStyle(color: Colors.black54, fontSize: 13),
                    ),
                    if (visitor != null)
                      Text(
                        'To ${visitor['phone'] ?? 'visitor'}',
                        style: const TextStyle(color: Colors.black54, fontSize: 13),
                      ),
                    TextButton(
                      onPressed: () => setState(() => _issuedPass = null),
                      child: const Text('Dismiss'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (_rows.isEmpty)
              EmptyState(
                message: 'No visitors yet. Expect a guest to create a pass.',
                icon: Icons.hail_outlined,
              )
            else
              ..._rows.map((row) {
                final id = '${row['id']}';
                final name = '${row['visitorName'] ?? ''}';
                final purpose = '${row['purpose'] ?? 'Visit'}';
                final passStatus = '${row['passStatus'] ?? 'none'}';
                final phone = row['phone'] as String?;
                final checkedIn = row['checkedInAt'] != null;
                final checkedOut = row['checkedOutAt'] != null;
                final status = _visitStatus(row);
                final initial =
                    name.trim().isEmpty ? 'V' : name.trim()[0].toUpperCase();

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Material(
                    color: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: BorderSide(
                        color: Colors.black.withValues(alpha: 0.06),
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 10, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  gradient: const LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: [
                                      AppColors.saffron,
                                      AppColors.leafDark,
                                    ],
                                  ),
                                ),
                                child: Text(
                                  initial,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 15,
                                      ),
                                    ),
                                    Text(
                                      '$purpose · Flat ${row['flatNumber'] ?? '—'}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.black.withValues(alpha: 0.45),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              _Chip(
                                label: status,
                                color: _statusColor(status),
                              ),
                              _Chip(
                                label: passStatus == 'none'
                                    ? 'No pass'
                                    : 'Pass: $passStatus',
                                color: passStatus == 'issued'
                                    ? const Color(0xFF6B5300)
                                    : passStatus == 'revoked'
                                        ? AppColors.danger
                                        : Colors.black45,
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 4,
                            children: [
                              if (!checkedOut && passStatus != 'used')
                                TextButton(
                                  onPressed: _busy ||
                                          phone == null ||
                                          phone.isEmpty
                                      ? null
                                      : () => _issuePass(id),
                                  child: Text(
                                    passStatus == 'issued' ? 'Resend' : 'Share',
                                  ),
                                ),
                              if (_isAdmin && passStatus == 'issued')
                                TextButton(
                                  onPressed: _busy ? null : () => _revoke(id),
                                  child: const Text('Revoke'),
                                ),
                              if (_isAdmin && !checkedIn && !checkedOut)
                                IconButton(
                                  tooltip: 'Check in',
                                  onPressed: _busy
                                      ? null
                                      : () async {
                                          await ref
                                              .read(apiProvider)
                                              .checkInVisitor(id);
                                          await _load();
                                        },
                                  icon: const Icon(Icons.login),
                                ),
                              if (_isAdmin && checkedIn && !checkedOut)
                                IconButton(
                                  tooltip: 'Check out',
                                  onPressed: _busy
                                      ? null
                                      : () async {
                                          await ref
                                              .read(apiProvider)
                                              .checkOutVisitor(id);
                                          await _load();
                                        },
                                  icon: const Icon(Icons.logout),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
              color: Colors.black.withValues(alpha: 0.4),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.leafDark,
            ),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
          color: color,
        ),
      ),
    );
  }
}
