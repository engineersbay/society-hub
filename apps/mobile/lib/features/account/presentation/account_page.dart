import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/models.dart';
import '../../../auth/session.dart';
import '../../../core/app_keys.dart';
import '../../../core/theme.dart';
import '../../../shared/widgets.dart';

class AccountPage extends ConsumerStatefulWidget {
  const AccountPage({super.key});

  @override
  ConsumerState<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends ConsumerState<AccountPage> {
  final _pin = TextEditingController();
  final _emergency = TextEditingController();
  final _vehicle = TextEditingController();
  ResidentProfileDto? _profile;
  bool _busy = false;
  bool _profileBusy = false;
  String? _message;
  String? _error;
  String? _profileMessage;
  String? _profileError;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _pin.dispose();
    _emergency.dispose();
    _vehicle.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await ref.read(apiProvider).getProfile();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _emergency.text = profile.emergencyContact ?? '';
        _vehicle.text = profile.vehicleNumber ?? '';
      });
    } on ApiException {
      // Profile is optional for staff without a residents row.
    }
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

  Future<void> _saveProfile() async {
    setState(() {
      _profileBusy = true;
      _profileError = null;
      _profileMessage = null;
    });
    try {
      final next = await ref.read(apiProvider).updateProfile(
            emergencyContact: _emergency.text.trim().isEmpty
                ? null
                : _emergency.text.trim(),
            vehicleNumber: _vehicle.text.trim().isEmpty
                ? null
                : _vehicle.text.trim().toUpperCase(),
          );
      if (!mounted) return;
      setState(() {
        _profile = next;
        _profileMessage = 'Profile updated';
      });
    } on ApiException catch (e) {
      setState(() => _profileError = e.message);
    } finally {
      if (mounted) setState(() => _profileBusy = false);
    }
  }

  Widget _flatField(String label, String value, {Key? key}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: Colors.black45,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            key: key,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).user;
    final flat = _profile?.flat;
    final flatLabel = flat != null
        ? flat.label
        : user?.flatNumber != null
            ? 'Flat ${user!.flatNumber}'
            : null;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Account', style: displayStyle(size: 28)),
        const SizedBox(height: 4),
        Text(
          [
            user?.email ?? user?.phone ?? 'No contact',
            user?.role ?? '—',
            if (flatLabel != null)
              flatLabel.startsWith('Flat') ? flatLabel : 'Flat $flatLabel',
          ].join(' · '),
          style: const TextStyle(color: Colors.black54),
        ),
        const SizedBox(height: 16),
        ShCard(
          key: AppKeys.accountFlatDetails,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'My flat',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
              ),
              const SizedBox(height: 4),
              const Text(
                'Society home linked to your account in this society.',
                style: TextStyle(color: Colors.black54, fontSize: 13),
              ),
              const SizedBox(height: 12),
              if (flat != null)
                Wrap(
                  spacing: 24,
                  runSpacing: 4,
                  children: [
                    SizedBox(
                      width: 140,
                      child: _flatField(
                        'Society',
                        _profile?.societyName ?? '—',
                        key: AppKeys.accountSocietyName,
                      ),
                    ),
                    SizedBox(
                      width: 140,
                      child: _flatField(
                        'Flat',
                        flat.label,
                        key: AppKeys.accountFlatNumber,
                      ),
                    ),
                    SizedBox(
                      width: 140,
                      child: _flatField(
                        'Building',
                        flat.buildingName ?? '—',
                      ),
                    ),
                    SizedBox(
                      width: 140,
                      child: _flatField('Wing', flat.wingName ?? '—'),
                    ),
                    SizedBox(
                      width: 140,
                      child: _flatField(
                        'Floor',
                        flat.floor != null ? '${flat.floor}' : '—',
                      ),
                    ),
                    SizedBox(
                      width: 140,
                      child: _flatField(
                        'Parking',
                        flat.parkingSlot ?? '—',
                      ),
                    ),
                    SizedBox(
                      width: 280,
                      child: _flatField(
                        'Occupancy',
                        flat.isOwner ? 'Owner' : 'Tenant / occupant',
                      ),
                    ),
                  ],
                )
              else
                const Text(
                  key: AppKeys.accountFlatEmpty,
                  'No flat is linked to your account in this society yet. Ask a society admin to onboard you.',
                  style: TextStyle(color: Colors.black54, fontSize: 13),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ShCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Profile',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              const Text(
                'Helpful for security and society records.',
                style: TextStyle(color: Colors.black54, fontSize: 14),
              ),
              const SizedBox(height: 12),
              TextField(
                key: AppKeys.accountEmergencyContact,
                controller: _emergency,
                decoration: const InputDecoration(
                  labelText: 'Emergency contact',
                  hintText: 'Name & phone number',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                key: AppKeys.accountVehicleNumber,
                controller: _vehicle,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'Vehicle number',
                  hintText: 'MH12AB1234',
                ),
              ),
              const SizedBox(height: 12),
              ShPrimaryButton(
                label: 'Save profile',
                busy: _profileBusy,
                onPressed: _saveProfile,
              ),
              if (_profileMessage != null) ...[
                const SizedBox(height: 8),
                Text(
                  _profileMessage!,
                  style: const TextStyle(color: Color(0xFF2E7D32)),
                ),
              ],
              if (_profileError != null) ...[
                const SizedBox(height: 8),
                Text(
                  _profileError!,
                  style: const TextStyle(color: AppColors.danger),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        ShCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                user?.name ?? '—',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 8),
              Text('Role: ${user?.role ?? '—'}'),
              Text('Phone: ${user?.phone ?? '—'}'),
              Text('Email: ${user?.email ?? '—'}'),
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
                Text(
                  _message!,
                  style: const TextStyle(color: Color(0xFF2E7D32)),
                ),
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
