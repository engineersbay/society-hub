import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/models.dart';
import '../../../auth/session.dart';
import '../../../core/theme.dart';
import '../../../shared/widgets.dart';

class ComplaintsPage extends ConsumerStatefulWidget {
  const ComplaintsPage({super.key});

  @override
  ConsumerState<ComplaintsPage> createState() => _ComplaintsPageState();
}

class _ComplaintsPageState extends ConsumerState<ComplaintsPage> {
  List<ComplaintDto> _items = [];
  String _search = '';
  String? _error;
  bool _loading = true;

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
      final res = await ref.read(apiProvider).listComplaints();
      if (mounted) setState(() => _items = res.items);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final staffView = ref.watch(sessionProvider.notifier).isStaffView;
    final q = _search.trim().toLowerCase();
    final filtered = q.isEmpty
        ? _items
        : _items.where((c) {
            return c.title.toLowerCase().contains(q) ||
                c.ticketNumber.toLowerCase().contains(q) ||
                (staffView && c.flatNumber.toLowerCase().contains(q));
          }).toList();

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.saffron,
        foregroundColor: Colors.white,
        onPressed: () => context.go('/home/complaints/new'),
        icon: const Icon(Icons.add),
        label: const Text('Raise complaint'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
          children: [
            Text('Complaints', style: displayStyle(size: 28)),
            const SizedBox(height: 4),
            Text(
              staffView
                  ? 'All society complaints — update status from detail'
                  : 'Your raised complaints',
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: InputDecoration(
                hintText: staffView
                    ? 'Search ticket, title or flat…'
                    : 'Search your complaints…',
                prefixIcon: const Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _search = v),
            ),
            const SizedBox(height: 16),
            if (_loading) const Center(child: CircularProgressIndicator()),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: AppColors.danger)),
            if (!_loading && filtered.isEmpty)
              const EmptyState(message: 'No complaints yet.'),
            ...filtered.map(
              (c) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ShCard(
                  onTap: () => context.go('/home/complaints/${c.id}'),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              c.ticketNumber,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.black45,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              c.title,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            if (staffView && c.flatNumber.isNotEmpty)
                              Text(
                                'Flat ${c.flatNumber}',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Colors.black54,
                                ),
                              ),
                          ],
                        ),
                      ),
                      StatusBadge(status: c.status),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class NewComplaintPage extends ConsumerStatefulWidget {
  const NewComplaintPage({super.key});

  @override
  ConsumerState<NewComplaintPage> createState() => _NewComplaintPageState();
}

class _NewComplaintPageState extends ConsumerState<NewComplaintPage> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  String _type = 'plumbing';
  bool _busy = false;
  String? _error;

  static const _types = [
    'electric',
    'plumbing',
    'housekeeping',
    'security',
    'lift',
    'other',
  ];

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final c = await ref.read(apiProvider).createComplaint(
            title: _title.text.trim(),
            type: _type,
            description: _description.text.trim(),
          );
      if (!mounted) return;
      context.go('/home/complaints/${c.id}');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Raise complaint', style: displayStyle(size: 28)),
        const SizedBox(height: 4),
        const Text(
          'Describe the issue clearly — one primary request.',
          style: TextStyle(color: Colors.black54),
        ),
        const SizedBox(height: 20),
        ShCard(
          child: Column(
            children: [
              TextField(
                controller: _title,
                decoration: const InputDecoration(labelText: 'Title'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                // ignore: deprecated_member_use
                value: _type,
                decoration: const InputDecoration(labelText: 'Type'),
                items: _types
                    .map(
                      (t) => DropdownMenuItem(
                        value: t,
                        child: Text(t.replaceAll('_', ' ')),
                      ),
                    )
                    .toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _type = v);
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _description,
                maxLines: 5,
                decoration: const InputDecoration(labelText: 'Description'),
              ),
              const SizedBox(height: 20),
              ShPrimaryButton(
                label: 'Submit complaint',
                busy: _busy,
                onPressed: _submit,
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppColors.danger)),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class ComplaintDetailPage extends ConsumerStatefulWidget {
  const ComplaintDetailPage({super.key, required this.id});

  final String id;

  @override
  ConsumerState<ComplaintDetailPage> createState() =>
      _ComplaintDetailPageState();
}

class _ComplaintDetailPageState extends ConsumerState<ComplaintDetailPage> {
  ComplaintDto? _item;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final c = await ref.read(apiProvider).getComplaint(widget.id);
      if (mounted) setState(() => _item = c);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _setStatus(String status) async {
    setState(() => _busy = true);
    try {
      final c =
          await ref.read(apiProvider).updateComplaintStatus(widget.id, status);
      if (mounted) setState(() => _item = c);
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final staffView = ref.watch(sessionProvider.notifier).isStaffView;
    final c = _item;

    if (_error != null) {
      return Center(child: Text(_error!, style: const TextStyle(color: AppColors.danger)));
    }
    if (c == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(c.ticketNumber, style: const TextStyle(color: Colors.black45)),
        const SizedBox(height: 4),
        Text(c.title, style: displayStyle(size: 26)),
        const SizedBox(height: 8),
        StatusBadge(status: c.status),
        const SizedBox(height: 16),
        ShCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Type: ${c.type}'),
              if (c.flatNumber.isNotEmpty) Text('Flat: ${c.flatNumber}'),
              if (c.residentName != null) Text('Resident: ${c.residentName}'),
              const SizedBox(height: 12),
              Text(c.description),
            ],
          ),
        ),
        if (staffView) ...[
          const SizedBox(height: 20),
          Text('Update status', style: displayStyle(size: 20)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final s in ['open', 'assigned', 'in_progress', 'resolved', 'closed'])
                OutlinedButton(
                  onPressed: _busy || c.status == s ? null : () => _setStatus(s),
                  child: Text(s.replaceAll('_', ' ')),
                ),
            ],
          ),
        ],
      ],
    );
  }
}
