import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../api/models.dart';
import '../../../auth/session.dart';
import '../../../core/app_keys.dart';
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
      final staffView = ref.read(sessionProvider.notifier).isStaffView;
      final res = await ref.read(apiProvider).listComplaints(mine: !staffView);
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
        key: AppKeys.newComplaintLink,
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
                  ? 'Society queue — acknowledge, start, or close from detail'
                  : 'Your tickets and queue status',
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 16),
            TextField(
              key: AppKeys.complaintsSearch,
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
              const EmptyState(
                key: AppKeys.complaintsEmpty,
                message: 'No complaints yet.',
              ),
            if (!_loading && filtered.isNotEmpty)
              Column(
                key: AppKeys.complaintsList,
                children: [
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
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  if (staffView && c.flatNumber.isNotEmpty)
                                    Text(
                                      'Flat ${c.flatNumber}',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: Colors.black54,
                                      ),
                                    ),
                                  if (!staffView &&
                                      c.queueHint != null &&
                                      c.status == 'open')
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        c.queueHint!,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.black45,
                                        ),
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
          ],
        ),
      ),
    );
  }
}

class _PickedFile {
  const _PickedFile({required this.path, required this.name});
  final String path;
  final String name;
}

class NewComplaintPage extends ConsumerStatefulWidget {
  const NewComplaintPage({super.key});

  @override
  ConsumerState<NewComplaintPage> createState() => _NewComplaintPageState();
}

class _NewComplaintPageState extends ConsumerState<NewComplaintPage> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _typeOther = TextEditingController();
  String _type = 'plumbing';
  String? _flatId;
  List<FlatDto> _flats = [];
  final List<_PickedFile> _files = [];
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
  void initState() {
    super.initState();
    final user = ref.read(sessionProvider).user;
    _flatId = user?.flatId;
    if (user?.flatId == null) {
      _loadFlats();
    }
  }

  Future<void> _loadFlats() async {
    try {
      final flats = await ref.read(apiProvider).listFlats();
      if (!mounted) return;
      setState(() {
        _flats = flats;
        _flatId ??= flats.isNotEmpty ? flats.first.id : null;
      });
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _error = e.message);
      }
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _typeOther.dispose();
    super.dispose();
  }

  Future<void> _pickPhotos() async {
    final picker = ImagePicker();
    final images = await picker.pickMultiImage(imageQuality: 85);
    if (images.isEmpty || !mounted) return;
    setState(() {
      for (final img in images) {
        if (_files.length >= 5) break;
        _files.add(_PickedFile(path: img.path, name: img.name));
      }
    });
  }

  Future<void> _submit() async {
    final user = ref.read(sessionProvider).user;
    final needsFlat = user?.flatId == null;
    if (needsFlat && (_flatId == null || _flatId!.isEmpty)) {
      setState(() => _error = 'Select a flat to raise this complaint');
      return;
    }
    if (_type == 'other' && _typeOther.text.trim().isEmpty) {
      setState(() => _error = 'Please describe the complaint type');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = ref.read(apiProvider);
      final c = await api.createComplaint(
        title: _title.text.trim(),
        type: _type,
        description: _description.text.trim(),
        flatId: needsFlat ? _flatId : null,
        typeOtherText: _type == 'other' ? _typeOther.text.trim() : null,
      );
      for (final file in _files) {
        await api.uploadAttachment(
          complaintId: c.id,
          filePath: file.path,
          filename: file.name,
        );
      }
      if (!mounted) return;
      context.go('/home/complaints/${c.id}?justCreated=1');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).user;
    final needsFlat = user?.flatId == null;

    return ListView(
      key: AppKeys.newComplaintForm,
      padding: const EdgeInsets.all(16),
      children: [
        Text('Raise a complaint', style: displayStyle(size: 28)),
        const SizedBox(height: 4),
        const Text(
          'Tell us what is wrong — add photos if you can. You will get a ticket number right away.',
          style: TextStyle(color: Colors.black54),
        ),
        if (user?.flatNumber != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.mist.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'Filing for flat ${user!.flatNumber}',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
        const SizedBox(height: 20),
        ShCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (needsFlat) ...[
                DropdownButtonFormField<String>(
                  // ignore: deprecated_member_use
                  value: _flatId,
                  decoration: const InputDecoration(labelText: 'Which flat?'),
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
                const SizedBox(height: 12),
              ],
              TextField(
                controller: _title,
                decoration: const InputDecoration(labelText: 'Title'),
              ),
              const SizedBox(height: 16),
              const Text(
                'Type',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final t in _types)
                    ChoiceChip(
                      label: Text(complaintTypeLabels[t] ?? t),
                      selected: _type == t,
                      onSelected: (_) => setState(() => _type = t),
                    ),
                ],
              ),
              if (_type == 'other') ...[
                const SizedBox(height: 12),
                TextField(
                  controller: _typeOther,
                  decoration: const InputDecoration(
                    labelText: 'Describe the type',
                  ),
                ),
              ],
              const SizedBox(height: 12),
              TextField(
                controller: _description,
                maxLines: 5,
                decoration: const InputDecoration(
                  labelText: 'What happened?',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: _busy ? null : _pickPhotos,
                icon: const Icon(Icons.photo_library_outlined),
                label: Text(
                  _files.isEmpty
                      ? 'Add photos (optional)'
                      : '${_files.length} photo(s) selected',
                ),
              ),
              if (_files.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final f in _files)
                      Chip(
                        label: Text(
                          f.name,
                          overflow: TextOverflow.ellipsis,
                        ),
                        onDeleted: () => setState(() => _files.remove(f)),
                      ),
                  ],
                ),
              ],
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
  const ComplaintDetailPage({
    super.key,
    required this.id,
    this.justCreated = false,
  });

  final String id;
  final bool justCreated;

  @override
  ConsumerState<ComplaintDetailPage> createState() =>
      _ComplaintDetailPageState();
}

class _ComplaintDetailPageState extends ConsumerState<ComplaintDetailPage> {
  ComplaintDto? _item;
  String? _error;
  bool _busy = false;
  final _note = TextEditingController();
  final List<_PickedFile> _evidence = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final c = await ref.read(apiProvider).getComplaint(widget.id);
      if (mounted) setState(() => _item = c);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _pickEvidence() async {
    final picker = ImagePicker();
    final images = await picker.pickMultiImage(imageQuality: 85);
    if (images.isEmpty || !mounted) return;
    setState(() {
      for (final img in images) {
        _evidence.add(_PickedFile(path: img.path, name: img.name));
      }
    });
  }

  Future<void> _applyStatus(String status) async {
    if ((status == 'resolved' || status == 'closed') &&
        _note.text.trim().length < 3) {
      setState(() =>
          _error = 'Add a short closing comment before resolving or closing.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = ref.read(apiProvider);
      for (final file in _evidence) {
        await api.uploadAttachment(
          complaintId: widget.id,
          filePath: file.path,
          filename: file.name,
        );
      }
      final note = _note.text.trim();
      final c = await api.updateComplaintStatus(
        widget.id,
        status,
        note: note.isEmpty ? null : note,
      );
      if (mounted) {
        setState(() {
          _item = c;
          _evidence.clear();
          _note.clear();
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final staffView = ref.watch(sessionProvider.notifier).isStaffView;
    final c = _item;

    if (_error != null && c == null) {
      return Center(
        child: Text(_error!, style: const TextStyle(color: AppColors.danger)),
      );
    }
    if (c == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final typeLabel = complaintTypeLabel(c.type, other: c.typeOtherText);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextButton.icon(
          onPressed: () => context.go('/home/complaints'),
          icon: const Icon(Icons.arrow_back, size: 18),
          label: const Text('Back to complaints'),
        ),
        if (widget.justCreated) ...[
          const SizedBox(height: 8),
          Container(
            key: AppKeys.complaintCreatedBanner,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.mist.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppColors.leaf.withValues(alpha: 0.35),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Complaint submitted',
                  style: displayStyle(size: 20),
                ),
                const SizedBox(height: 6),
                Text(
                  'Your ticket number is ${c.ticketNumber}. The society office was notified by email and WhatsApp.',
                ),
                if (c.queueHint != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    key: AppKeys.complaintQueueHint,
                    c.queuePosition != null
                        ? '${c.queueHint!} (position #${c.queuePosition})'
                        : c.queueHint!,
                    style: const TextStyle(color: Colors.black54),
                  ),
                ],
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
        Text(c.ticketNumber, style: const TextStyle(color: Colors.black45)),
        const SizedBox(height: 4),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(c.title, style: displayStyle(size: 26)),
            ),
            StatusBadge(status: c.status),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          [
            if (c.flatNumber.isNotEmpty) 'Flat ${c.flatNumber}',
            typeLabel,
            if (c.residentName != null) c.residentName!,
          ].join(' · '),
          style: const TextStyle(color: Colors.black54, fontSize: 13),
        ),
        if (!staffView && c.queueHint != null && c.status == 'open') ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.mist.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '${c.queueHint!} Admins may acknowledge when ready — your ticket stays safe in the queue until then.',
              style: const TextStyle(fontSize: 13, color: Colors.black87),
            ),
          ),
        ],
        const SizedBox(height: 16),
        ShCard(
          child: Text(c.description, style: const TextStyle(height: 1.45)),
        ),
        if (c.closingNote != null && c.closingNote!.isNotEmpty) ...[
          const SizedBox(height: 16),
          ShCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CLOSING NOTE FROM OFFICE',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                    color: Colors.black45,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  c.closingNote!,
                  key: AppKeys.complaintClosingNote,
                ),
              ],
            ),
          ),
        ],
        if (c.attachments.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text('Photos & evidence', style: displayStyle(size: 18)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final a in c.attachments)
                Container(
                  width: 96,
                  height: 72,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.sand),
                    color: AppColors.mist.withValues(alpha: 0.4),
                  ),
                  child: Text(
                    a.contentKind == 'image'
                        ? 'Image'
                        : 'Video · ${(a.byteSize / 1024).round()} KB',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 11),
                  ),
                ),
            ],
          ),
        ],
        if (c.statusEvents.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text('Activity', style: displayStyle(size: 18)),
          const SizedBox(height: 8),
          ...c.statusEvents.map(
            (ev) => Padding(
              padding: const EdgeInsets.only(bottom: 10, left: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.only(top: 6, right: 10),
                    decoration: const BoxDecoration(
                      color: AppColors.leaf,
                      shape: BoxShape.circle,
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          [
                            complaintStatusLabel(ev.toStatus),
                            if (ev.actorName != null) ev.actorName!,
                          ].join(' · '),
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        if (ev.note != null && ev.note!.isNotEmpty)
                          Text(
                            ev.note!,
                            style: const TextStyle(color: Colors.black54),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
        if (staffView) ...[
          const SizedBox(height: 24),
          ShCard(
            key: AppKeys.complaintStaffActions,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Office actions', style: displayStyle(size: 20)),
                const SizedBox(height: 6),
                const Text(
                  'Leave it in queue if you are busy. Acknowledge when you have seen it. Start when work begins. Resolve/close with a short note and optional evidence photos.',
                  style: TextStyle(color: Colors.black54, fontSize: 13),
                ),
                const SizedBox(height: 12),
                TextField(
                  key: AppKeys.complaintStaffNote,
                  controller: _note,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Note / closing comment',
                    hintText: 'Required when resolving or closing',
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _busy ? null : _pickEvidence,
                  icon: const Icon(Icons.add_a_photo_outlined),
                  label: Text(
                    _evidence.isEmpty
                        ? 'Evidence photos (optional)'
                        : '${_evidence.length} evidence file(s)',
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (c.status == 'open')
                      OutlinedButton(
                        key: AppKeys.complaintAck,
                        onPressed:
                            _busy ? null : () => _applyStatus('assigned'),
                        child: const Text('Acknowledge'),
                      ),
                    if (c.status == 'open' || c.status == 'assigned')
                      FilledButton(
                        key: AppKeys.complaintStart,
                        onPressed: _busy
                            ? null
                            : () => _applyStatus('in_progress'),
                        child: const Text('Start work'),
                      ),
                    if (c.status != 'resolved' && c.status != 'closed')
                      OutlinedButton(
                        key: AppKeys.complaintResolve,
                        onPressed:
                            _busy ? null : () => _applyStatus('resolved'),
                        child: const Text('Mark resolved'),
                      ),
                    if (c.status != 'closed')
                      FilledButton(
                        key: AppKeys.complaintClose,
                        onPressed:
                            _busy ? null : () => _applyStatus('closed'),
                        child: const Text('Close ticket'),
                      ),
                  ],
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _error!,
                    style: const TextStyle(color: AppColors.danger),
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}
