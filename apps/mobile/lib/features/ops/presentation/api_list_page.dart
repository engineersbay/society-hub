import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/session.dart';
import '../../../shared/widgets.dart';

/// Lightweight list screens for Phase 2 demo modules (bills, notices, ops).
class ApiListPage extends ConsumerStatefulWidget {
  const ApiListPage({
    super.key,
    required this.title,
    required this.path,
    this.itemsKey = 'items',
    this.titleField = 'title',
    this.subtitleField,
  });

  final String title;
  final String path;
  final String itemsKey;
  final String titleField;
  final String? subtitleField;

  @override
  ConsumerState<ApiListPage> createState() => _ApiListPageState();
}

class _ApiListPageState extends ConsumerState<ApiListPage> {
  List<Map<String, dynamic>> _rows = [];
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
      final api = ref.read(apiProvider);
      final json = await api.getJson(widget.path);
      List<dynamic> list;
      if (json is Map &&
          widget.itemsKey.isNotEmpty &&
          json[widget.itemsKey] is List) {
        list = json[widget.itemsKey] as List;
      } else if (json is List) {
        list = json;
      } else if (json is Map && json['items'] is List) {
        list = json['items'] as List;
      } else {
        list = const [];
      }
      setState(() {
        _rows = list
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(_error!, textAlign: TextAlign.center),
          ),
        ),
      );
    }
    if (_rows.isEmpty) {
      return Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: EmptyState(
            message: 'No ${widget.title.toLowerCase()} yet.',
          ),
        ),
      );
    }
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          itemCount: _rows.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) {
            final row = _rows[i];
            final title =
                '${row[widget.titleField] ?? row['name'] ?? row['visitorName'] ?? row['facilityName'] ?? row['id']}';
            final sub = widget.subtitleField != null
                ? '${row[widget.subtitleField]}'
                : null;
            final status = sub != null && sub != 'null' ? sub : null;
            final isStatusField = widget.subtitleField == 'status' ||
                widget.subtitleField == 'category';
            return ShListRow(
              title: title,
              subtitle: isStatusField ? null : status,
              status: isStatusField ? status : null,
            );
          },
        ),
      ),
    );
  }
}
