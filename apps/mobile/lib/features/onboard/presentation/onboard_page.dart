import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/models.dart';
import '../../../auth/session.dart';
import '../../../core/theme.dart';
import '../../../shared/widgets.dart';

/// Manual single-resident onboard only. CSV / bulk import stays on web Client App.
class OnboardPage extends ConsumerStatefulWidget {
  const OnboardPage({super.key});

  @override
  ConsumerState<OnboardPage> createState() => _OnboardPageState();
}

class _OnboardPageState extends ConsumerState<OnboardPage> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  List<FlatDto> _flats = [];
  String? _flatId;
  String? _societyName;
  bool _busy = false;
  String? _message;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final session = ref.read(sessionProvider);
    if (!canUseAdminMode(session.user?.role)) return;
    final api = ref.read(apiProvider);
    try {
      final flats = await api.listFlats();
      if (mounted) {
        setState(() {
          _flats = flats;
          _flatId = flats.isNotEmpty ? flats.first.id : null;
        });
      }
    } catch (_) {}
    try {
      final memberships = await api.listMemberships();
      MembershipDto? mine;
      for (final m in memberships) {
        if (m.tenantId == session.user?.tenantId) {
          mine = m;
          break;
        }
      }
      if (mounted && mine != null) {
        setState(() => _societyName = mine!.societyName);
      }
    } catch (_) {}
  }

  Future<void> _submit() async {
    final flatId = _flatId;
    if (flatId == null) {
      setState(() => _error = 'Select a flat first. Create flats on web Structure if needed.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });
    try {
      final user = await ref.read(apiProvider).onboardResident(
            name: _name.text.trim(),
            phone: _phone.text.trim(),
            flatId: flatId,
            email: _email.text.trim().isEmpty ? null : _email.text.trim(),
          );
      setState(() {
        _message = 'Onboarded ${user.name ?? user.phone}';
        _name.clear();
        _phone.clear();
        _email.clear();
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    if (!canUseAdminMode(session.user?.role) ||
        session.mode != AppMode.admin) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go('/home/dashboard');
      });
      return const SizedBox.shrink();
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Onboard residents', style: displayStyle(size: 28)),
        const SizedBox(height: 4),
        const Text(
          'Add one resident at a time. Bulk CSV import is available on the web Client App.',
          style: TextStyle(color: Colors.black54),
        ),
        const SizedBox(height: 20),
        ShCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Single resident',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
              ),
              const SizedBox(height: 12),
              TextField(
                readOnly: true,
                controller: TextEditingController(text: _societyName ?? '—'),
                decoration: const InputDecoration(
                  labelText: 'Society',
                  filled: true,
                  fillColor: Color(0xFFFFF5EB),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Resident name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email (optional)'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                // ignore: deprecated_member_use
                value: _flatId,
                decoration: const InputDecoration(labelText: 'Flat'),
                items: _flats
                    .map(
                      (f) => DropdownMenuItem(
                        value: f.id,
                        child: Text(f.label),
                      ),
                    )
                    .toList(),
                onChanged: (v) => setState(() => _flatId = v),
              ),
              const SizedBox(height: 20),
              ShPrimaryButton(
                label: 'Onboard resident',
                busy: _busy,
                onPressed: _submit,
              ),
              if (_message != null) ...[
                const SizedBox(height: 12),
                Text(_message!, style: const TextStyle(color: Color(0xFF2E7D32))),
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppColors.danger)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        ShCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Bulk import',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              const Text(
                'CSV / bulk resident import stays on the web Client App for easier file handling.',
                style: TextStyle(color: Colors.black54, fontSize: 14),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
