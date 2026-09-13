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
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Expect a visitor'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Visitor name'),
              textCapitalization: TextCapitalization.words,
            ),
            TextField(
              controller: phoneCtrl,
              decoration: const InputDecoration(
                labelText: 'Phone (required to share pass)',
              ),
              keyboardType: TextInputType.phone,
            ),
            TextField(
              controller: purposeCtrl,
              decoration: const InputDecoration(labelText: 'Purpose'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Save'),
          ),
        ],
      ),
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

  @override
  Widget build(BuildContext context) {
    final visitor = _issuedPass?['visitor'] as Map?;
    final otp = '${_issuedPass?['otp'] ?? ''}';
    final qr = '${_issuedPass?['qrPayload'] ?? ''}';
    final expires = '${_issuedPass?['expiresAt'] ?? ''}';

    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      body: RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          ShPrimaryButton(
            label: 'Expect a visitor',
            busy: _busy,
            onPressed: _createVisitor,
          ),
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
                  Text('Pass shared', style: displayStyle(size: 18)),
                  const SizedBox(height: 8),
                  const Text(
                    'OTP and QR shown once. Resend issues a new code.',
                    style: TextStyle(color: Colors.black54, fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  if (qr.isNotEmpty)
                    Image.network(
                      'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${Uri.encodeComponent(qr)}',
                      width: 200,
                      height: 200,
                      errorBuilder: (_, _, _) => SelectableText(qr),
                    ),
                  const SizedBox(height: 8),
                  Text(
                    otp,
                    style: displayStyle(size: 28).copyWith(letterSpacing: 4),
                  ),
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
            const EmptyState(
              message: 'No visitors yet.',
              icon: Icons.hail_outlined,
            )
          else
            ..._rows.map((row) {
              final id = '${row['id']}';
              final name = '${row['visitorName'] ?? ''}';
              final purpose = '${row['purpose'] ?? '—'}';
              final passStatus = '${row['passStatus'] ?? 'none'}';
              final phone = row['phone'] as String?;
              final checkedIn = row['checkedInAt'] != null;
              final checkedOut = row['checkedOutAt'] != null;
              final status = checkedOut
                  ? 'Checked out'
                  : checkedIn
                      ? 'On site'
                      : 'Expected';
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ShListRow(
                  title: name,
                  subtitle:
                      '$purpose · Flat ${row['flatNumber'] ?? '—'} · $status',
                  status: 'Pass: $passStatus',
                  trailing: Wrap(
                    spacing: 4,
                    children: [
                      if (!checkedOut && passStatus != 'used')
                        TextButton(
                          onPressed: _busy || phone == null || phone.isEmpty
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
                ),
              );
            }),
        ],
      ),
      ),
    );
  }
}
