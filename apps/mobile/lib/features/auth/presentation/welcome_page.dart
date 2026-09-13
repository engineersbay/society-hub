import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../auth/session.dart';
import '../../../core/app_keys.dart';
import '../../../core/app_version.dart';
import '../../../core/theme.dart';
import '../../../shared/widgets.dart';

/// Logged-out landing: brand + pitch + Login CTA (FR-AUTH welcome step).
class WelcomePage extends ConsumerWidget {
  const WelcomePage({super.key});

  Future<void> _openPrivacy(WidgetRef ref) async {
    final url = Uri.parse(ref.read(apiConfigProvider).resolvedPrivacyPolicyUrl);
    await launchUrl(url, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    if (!session.loading && session.user != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go('/select-society');
      });
    }

    if (session.loading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(key: AppKeys.loginBusy),
        ),
      );
    }

    return Scaffold(
      key: AppKeys.welcomePage,
      backgroundColor: AppColors.paper,
      body: SafeArea(
        child: Stack(
          children: [
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 32, 24, 120),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Center(child: BrandMark()),
                      const SizedBox(height: 28),
                      Text(
                        'Your society, in one place',
                        textAlign: TextAlign.center,
                        style: displayStyle(size: 28),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Raise complaints, check dues, and stay updated — '
                        'with the mobile your society onboarded.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: 'sans-serif',
                          color: Colors.black54,
                          fontSize: 15,
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: 28),
                      const Row(
                        children: [
                          Expanded(
                            child: _FeatureChip(
                              icon: Icons.report_problem_outlined,
                              label: 'Complaints',
                            ),
                          ),
                          SizedBox(width: 10),
                          Expanded(
                            child: _FeatureChip(
                              icon: Icons.receipt_long_outlined,
                              label: 'Bills',
                            ),
                          ),
                          SizedBox(width: 10),
                          Expanded(
                            child: _FeatureChip(
                              icon: Icons.campaign_outlined,
                              label: 'Notices',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),
                      ShPrimaryButton(
                        key: AppKeys.welcomeLogin,
                        label: 'Login',
                        onPressed: () => context.push('/login'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Align(
              alignment: Alignment.bottomCenter,
              child: _WelcomeVersionFooter(
                info: ref.watch(installedAppInfoProvider),
                onUpdate: () =>
                    ref.read(appVersionSourceProvider).startUpdate(),
                onPrivacy: () => _openPrivacy(ref),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureChip extends StatelessWidget {
  const _FeatureChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.sand),
      ),
      child: Column(
        children: [
          Icon(icon, size: 22, color: AppColors.leafDark),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.ink,
            ),
          ),
        ],
      ),
    );
  }
}

class _WelcomeVersionFooter extends StatelessWidget {
  const _WelcomeVersionFooter({
    required this.info,
    required this.onUpdate,
    required this.onPrivacy,
  });

  final AsyncValue<InstalledAppInfo> info;
  final Future<void> Function() onUpdate;
  final Future<void> Function() onPrivacy;

  @override
  Widget build(BuildContext context) {
    return info.when(
      data: (value) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Installed version ${value.versionLabel}',
              key: AppKeys.loginVersion,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.black54, fontSize: 13),
            ),
            if (value.updateAvailable) ...[
              const SizedBox(height: 8),
              OutlinedButton(
                key: AppKeys.loginUpdate,
                onPressed: () => onUpdate(),
                child: const Text('Update'),
              ),
            ],
            TextButton(
              onPressed: () => onPrivacy(),
              child: const Text('Privacy'),
            ),
          ],
        ),
      ),
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
    );
  }
}
