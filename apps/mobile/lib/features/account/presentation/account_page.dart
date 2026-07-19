import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/models.dart';
import '../../../auth/session.dart';
import '../../../core/theme.dart';
import '../../../shared/widgets.dart';

class AccountPage extends ConsumerStatefulWidget {
  const AccountPage({super.key});

  @override
  ConsumerState<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends ConsumerState<AccountPage> {
  final _pin = TextEditingController();
  bool _busy = false;
  String? _message;
  String? _error;

  @override
  void dispose() {
    _pin.dispose();
    super.dispose();
  }

  Future<void> _setPin() async {
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });
    try {
      await ref.read(apiProvider).setPin(_pin.text.trim());
      setState(() {
        _message = 'PIN saved';
        _pin.clear();
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).user;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Account', style: displayStyle(size: 28)),
        const SizedBox(height: 16),
        ShCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(user?.name ?? '—', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 18)),
              const SizedBox(height: 8),
              Text('Role: ${user?.role ?? '—'}'),
              Text('Phone: ${user?.phone ?? '—'}'),
              Text('Email: ${user?.email ?? '—'}'),
              if (user?.flatNumber != null) Text('Flat: ${user!.flatNumber}'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ShCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Quick login PIN',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              const Text(
                'Set a PIN for faster mobile sign-in next time.',
                style: TextStyle(color: Colors.black54, fontSize: 14),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _pin,
                obscureText: true,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'New PIN'),
              ),
              const SizedBox(height: 12),
              ShPrimaryButton(
                label: 'Save PIN',
                busy: _busy,
                onPressed: _setPin,
              ),
              if (_message != null) ...[
                const SizedBox(height: 8),
                Text(_message!, style: const TextStyle(color: Color(0xFF2E7D32))),
              ],
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: AppColors.danger)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 24),
        OutlinedButton(
          onPressed: () async {
            await ref.read(sessionProvider.notifier).clearSession();
            if (context.mounted) context.go('/login');
          },
          child: const Text('Log out'),
        ),
      ],
    );
  }
}

class ComingSoonPage extends StatelessWidget {
  const ComingSoonPage({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: displayStyle(size: 28)),
          const SizedBox(height: 16),
          const EmptyState(
            message:
                'Coming soon on mobile. Use the web Client App for full access to this area.',
          ),
        ],
      ),
    );
  }
}
