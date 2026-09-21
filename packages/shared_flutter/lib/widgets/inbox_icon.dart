import 'dart:async';

import 'package:flutter/material.dart';

import '../api/inbox_api.dart';

const _pollInterval = Duration(seconds: 20);

/// AppBar action: an envelope icon with an unread-count badge, opening the
/// unified inbox. Mirrors the web apps' InboxIcon (same 20s poll).
class InboxIcon extends StatefulWidget {
  const InboxIcon({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  State<InboxIcon> createState() => _InboxIconState();
}

class _InboxIconState extends State<InboxIcon> {
  int _unreadTotal = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(_pollInterval, (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final res = await fetchInbox();
      if (mounted) setState(() => _unreadTotal = res.unreadTotal);
    } catch (_) {
      // Best-effort — keep the last known count on a transient poll failure.
    }
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: widget.onTap,
      icon: Badge(
        label: Text(_unreadTotal > 99 ? '99+' : '$_unreadTotal'),
        isLabelVisible: _unreadTotal > 0,
        child: const Icon(Icons.mail_outline),
      ),
    );
  }
}
