import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/session.dart';
import '../../../core/theme.dart';
import '../../../shared/widgets.dart';

/// Gate / security verify screen (admin mode only).
class GatePage extends ConsumerStatefulWidget {
  const GatePage({super.key});

  @override
  ConsumerState<GatePage> createState() => _GatePageState();
}

class _GatePageState extends ConsumerState<GatePage> {
  final _tokenCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  Map<String, dynamic>? _preview;
  List<Map<String, dynamic>> _onsite = [];
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _loadOnsite();
  }

  @override
  void dispose() {
    _tokenCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadOnsite() async {
    try {
      final rows = await ref.read(apiProvider).listVisitors();
      setState(() {
        _onsite = rows
            .where((r) => r['checkedInAt'] != null && r['checkedOutAt'] == null)
            .toList();
      });
    } catch (_) {
      setState(() => _onsite = []);
    }
  }

  String? _extractToken(String raw) {
    final t = raw.trim();
    if (t.startsWith('shv1.')) {
      final parts = t.split('.');
      if (parts.length >= 3) return parts[2];
    }
    final uuid = RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      caseSensitive: false,
    );
    if (uuid.hasMatch(t)) return t;
    return null;
  }

  Future<void> _runPreview() async {
    setState(() {
      _error = null;
      _preview = null;
      _busy = true;
    });
    try {
      final token = _extractToken(_tokenCtrl.text);
      if (token == null) {
        setState(() => _error = 'Paste a pass token or QR payload');
        return;
      }
      final p = await ref.read(apiProvider).previewGatePass(token);
      setState(() => _preview = p);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    setState(() {
      _error = null;
      _busy = true;
    });
    try {
      final raw = _tokenCtrl.text.trim();
      if (raw.startsWith('shv1.')) {
        await ref.read(apiProvider).verifyGatePass(
              qrPayload: raw,
              otp: _otpCtrl.text.trim().isEmpty ? null : _otpCtrl.text.trim(),
            );
      } else {
        final token = _extractToken(raw);
        if (token == null) {
          setState(() => _error = 'Invalid pass token');
          return;
        }
        await ref.read(apiProvider).verifyGatePass(
              passToken: token,
              otp: _otpCtrl.text.trim().isEmpty ? null : _otpCtrl.text.trim(),
            );
      }
      _tokenCtrl.clear();
      _otpCtrl.clear();
      setState(() => _preview = null);
      await _loadOnsite();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Visitor checked in')),
        );
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        Text('Gate verify', style: displayStyle(size: 22)),
        const SizedBox(height: 4),
        const Text(
          'Paste a pass token or QR payload, preview, then confirm entry.',
          style: TextStyle(color: Colors.black54, height: 1.4),
        ),
        const SizedBox(height: 16),
        ShCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _tokenCtrl,
                decoration: const InputDecoration(
                  labelText: 'Pass token or QR payload',
                ),
                minLines: 1,
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _otpCtrl,
                decoration: const InputDecoration(
                  labelText: 'OTP (optional if QR scanned)',
                ),
                keyboardType: TextInputType.number,
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _busy ? null : _runPreview,
                child: const Text('Preview'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton(
                onPressed: _busy || _preview == null ? null : _confirm,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.saffron,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                ),
                child: const Text('Confirm entry'),
              ),
            ),
          ],
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: AppColors.danger)),
        ],
        if (_preview != null) ...[
          const SizedBox(height: 16),
          ShListRow(
            title: '${_preview!['visitorName']}',
            subtitle:
                'Flat ${_preview!['flatNumber'] ?? '—'} · ${_preview!['purpose'] ?? '—'}',
            status: '${_preview!['passStatus']}',
          ),
          const SizedBox(height: 8),
          Text(
            'Expires ${_preview!['expiresAt'] ?? '—'}',
            style: const TextStyle(color: Colors.black54, fontSize: 13),
          ),
        ],
        const SizedBox(height: 28),
        Text('On site now', style: displayStyle(size: 18)),
        const SizedBox(height: 10),
        if (_onsite.isEmpty)
          const EmptyState(
            message: 'No visitors checked in.',
            icon: Icons.door_front_door_outlined,
          )
        else
          ..._onsite.map(
            (v) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ShListRow(
                title: '${v['visitorName']}',
                subtitle: 'Flat ${v['flatNumber'] ?? '—'}',
                trailing: TextButton(
                  onPressed: () async {
                    await ref
                        .read(apiProvider)
                        .checkOutVisitor('${v['id']}');
                    await _loadOnsite();
                  },
                  child: const Text('Check out'),
                ),
              ),
            ),
          ),
      ],
      ),
    );
  }
}
