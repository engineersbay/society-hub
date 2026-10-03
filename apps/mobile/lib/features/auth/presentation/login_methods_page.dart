import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../auth/session.dart';
import '../../../core/app_keys.dart';
import '../../../core/theme.dart';
import '../../../shared/widgets.dart';

/// Second auth step: pick OTP / Google / PIN / Email.
class LoginMethodsPage extends ConsumerWidget {
  const LoginMethodsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    if (!session.loading && session.user != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go('/select-society');
      });
    }

    return Scaffold(
      key: AppKeys.loginMethodsPage,
      backgroundColor: AppColors.paper,
      appBar: AppBar(
        title: Text('Sign in', style: displayStyle(size: 20)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/welcome');
            }
          },
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'How would you like to sign in?',
                    style: displayStyle(size: 22),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Use the method your society set up for you.',
                    style: TextStyle(color: Colors.black54, height: 1.4),
                  ),
                  const SizedBox(height: 20),
                  AuthLauncherTile(
                    key: AppKeys.loginModeOtp,
                    icon: Icons.sms_outlined,
                    title: 'OTP',
                    hint: 'Mobile number your society onboarded',
                    onTap: () => context.push('/login/otp'),
                  ),
                  const SizedBox(height: 10),
                  AuthLauncherTile(
                    key: AppKeys.loginModeGoogle,
                    icon: Icons.g_mobiledata,
                    title: 'Google',
                    hint: 'Google account linked to your flat',
                    onTap: () => context.push('/login/google'),
                  ),
                  const SizedBox(height: 10),
                  AuthLauncherTile(
                    key: AppKeys.loginModePin,
                    icon: Icons.pin_outlined,
                    title: 'PIN',
                    hint: 'Returning residents with a PIN in Account',
                    onTap: () => context.push('/login/pin'),
                  ),
                  const SizedBox(height: 10),
                  AuthLauncherTile(
                    key: AppKeys.loginModePassword,
                    icon: Icons.email_outlined,
                    title: 'Email',
                    hint: 'Committee email and password',
                    onTap: () => context.push('/login/password'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
