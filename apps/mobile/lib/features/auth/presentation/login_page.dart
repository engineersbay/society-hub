import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/models.dart';
import '../../../auth/session.dart';
import '../../../config/api_config.dart';
import '../../../core/app_keys.dart';
import '../../../core/theme.dart';
import '../../../shared/widgets.dart';

enum _LoginMode { password, otp, pin, google }

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  _LoginMode _mode = _LoginMode.password;
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _phone = TextEditingController();
  final _code = TextEditingController();
  final _pin = TextEditingController();
  bool _otpSent = false;
  bool _busy = false;
  String? _error;
  String? _devHint;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _phone.dispose();
    _code.dispose();
    _pin.dispose();
    super.dispose();
  }

  Future<void> _apply(Future<LoginResult> Function() login) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await login();
      await ref.read(sessionProvider.notifier).setSession(res.user, res.tokens);
      if (!mounted) return;
      context.go('/select-society');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _requestOtp() async {
    setState(() {
      _busy = true;
      _error = null;
      _devHint = null;
    });
    try {
      final res = await ref.read(apiProvider).requestOtp(_phone.text.trim());
      setState(() {
        _otpSent = true;
        if (res.devCode != null) _devHint = 'Dev OTP: ${res.devCode}';
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
    if (!session.loading && session.user != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/select-society');
      });
    }

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: ShCard(
                padding: const EdgeInsets.all(28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(child: BrandMark()),
                    const SizedBox(height: 16),
                    const Text(
                      'Sign in to raise complaints, pay dues and stay updated.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.black54, fontSize: 14),
                    ),
                    const SizedBox(height: 20),
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 8,
                      runSpacing: 8,
                      children: _LoginMode.values.map((m) {
                        final selected = _mode == m;
                        return ChoiceChip(
                          key: _modeKey(m),
                          label: Text(_modeLabel(m)),
                          selected: selected,
                          onSelected: (_) => setState(() {
                            _mode = m;
                            _error = null;
                          }),
                          selectedColor: AppColors.mist,
                          labelStyle: TextStyle(
                            color: selected ? AppColors.leafDark : AppColors.ink,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                          side: BorderSide(
                            color: selected ? AppColors.leaf : AppColors.sand,
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),
                    if (_mode == _LoginMode.password) ..._passwordForm(),
                    if (_mode == _LoginMode.otp) ..._otpForm(),
                    if (_mode == _LoginMode.pin) ..._pinForm(),
                    if (_mode == _LoginMode.google) ..._googleForm(),
                    if (_devHint != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _devHint!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.alert),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        key: AppKeys.loginError,
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
      ),
    );
  }

  Key _modeKey(_LoginMode m) => switch (m) {
        _LoginMode.password => AppKeys.loginModePassword,
        _LoginMode.otp => AppKeys.loginModeOtp,
        _LoginMode.pin => AppKeys.loginModePin,
        _LoginMode.google => AppKeys.loginModeGoogle,
      };

  String _modeLabel(_LoginMode m) => switch (m) {
        _LoginMode.password => 'Email',
        _LoginMode.otp => 'OTP',
        _LoginMode.pin => 'PIN',
        _LoginMode.google => 'Google',
      };

  List<Widget> _passwordForm() => [
        TextField(
          key: AppKeys.loginEmail,
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: 'Email'),
        ),
        const SizedBox(height: 12),
        TextField(
          key: AppKeys.loginPassword,
          controller: _password,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Password'),
        ),
        const SizedBox(height: 20),
        ShPrimaryButton(
          key: AppKeys.loginSubmit,
          label: 'Sign in',
          busy: _busy,
          onPressed: () => _apply(
            () => ref.read(apiProvider).loginPassword(
                  _email.text.trim(),
                  _password.text,
                ),
          ),
        ),
      ];

  List<Widget> _otpForm() => [
        TextField(
          key: AppKeys.loginPhone,
          controller: _phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Mobile'),
        ),
        if (_otpSent) ...[
          const SizedBox(height: 12),
          TextField(
            key: AppKeys.loginOtpCode,
            controller: _code,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'OTP'),
          ),
        ],
        const SizedBox(height: 20),
        ShPrimaryButton(
          key: AppKeys.loginSubmit,
          label: _otpSent ? 'Verify & continue' : 'Send OTP',
          busy: _busy,
          onPressed: () {
            if (_otpSent) {
              _apply(
                () => ref.read(apiProvider).verifyOtp(
                      _phone.text.trim(),
                      _code.text.trim(),
                    ),
              );
            } else {
              _requestOtp();
            }
          },
        ),
      ];

  List<Widget> _pinForm() => [
        TextField(
          key: AppKeys.loginPhone,
          controller: _phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Mobile'),
        ),
        const SizedBox(height: 12),
        TextField(
          key: AppKeys.loginPin,
          controller: _pin,
          obscureText: true,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'PIN'),
        ),
        const SizedBox(height: 20),
        ShPrimaryButton(
          key: AppKeys.loginSubmit,
          label: 'Sign in with PIN',
          busy: _busy,
          onPressed: () => _apply(
            () => ref.read(apiProvider).loginPin(
                  _phone.text.trim(),
                  _pin.text.trim(),
                ),
          ),
        ),
      ];

  List<Widget> _googleForm() {
    final isDev = ApiConfig.fromEnvironment().isDev;
    return [
      Text(
        isDev
            ? 'Dev Google SSO uses your onboarded phone as dev:<phone>.'
            : 'Sign in with Google (configure OAuth client IDs for release).',
        style: const TextStyle(color: Colors.black54, fontSize: 14),
      ),
      const SizedBox(height: 12),
      TextField(
        key: AppKeys.loginPhone,
        controller: _phone,
        keyboardType: TextInputType.phone,
        decoration: InputDecoration(
          labelText: isDev ? 'Mobile (dev)' : 'Phone linked to Google',
        ),
      ),
      const SizedBox(height: 20),
      ShPrimaryButton(
        key: AppKeys.loginSubmit,
        label: isDev ? 'Continue with Google (dev)' : 'Continue with Google',
        busy: _busy,
        onPressed: () {
          if (!isDev) {
            setState(() {
              _error =
                  'Production Google Sign-In requires OAuth setup. Use OTP or email for now.';
            });
            return;
          }
          _apply(
            () => ref
                .read(apiProvider)
                .loginGoogle('dev:${_phone.text.trim()}'),
          );
        },
      ),
    ];
  }
}
