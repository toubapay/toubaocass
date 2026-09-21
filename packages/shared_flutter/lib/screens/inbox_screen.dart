import 'package:flutter/material.dart';

import '../api/inbox_api.dart';
import '../models.dart';
import '../theme.dart';

const _typeIcon = {
  'booking': '🚌',
  'dem_legui_request': '🚕',
  'anando': '🚗',
  'delivery': '📦',
};

/// Every conversation the user is part of, across every ride/delivery type,
/// most recent first — the "browse everything" counterpart to whichever
/// per-app "jump to the one most relevant conversation" shortcut already
/// exists. Mirrors the web apps' InboxPage.
class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key, required this.onOpenThread});

  /// Navigation differs per app/thread type, so the caller resolves it.
  final void Function(InboxThread thread) onOpenThread;

  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> {
  List<InboxThread> threads = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    fetchInbox().then((res) {
      if (mounted) setState(() => threads = res.data);
    }).whenComplete(() {
      if (mounted) setState(() => loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : threads.isEmpty
              ? const Center(
                  child: Text('Aucune conversation pour l\'instant.',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 15)),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  itemCount: threads.length,
                  itemBuilder: (context, index) {
                    final thread = threads[index];
                    final unread = thread.unreadCount > 0;
                    return InkWell(
                      onTap: () => widget.onOpenThread(thread),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      child: Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            Text(_typeIcon[thread.type] ?? '💬', style: const TextStyle(fontSize: 22)),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    thread.otherPartyName ?? 'Utilisateur',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: unread ? FontWeight.w800 : FontWeight.w700,
                                      color: AppColors.text,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (thread.preview != null)
                                    Text(
                                      thread.preview!,
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        color: unread ? AppColors.text : AppColors.textMuted,
                                        fontWeight: unread ? FontWeight.w600 : FontWeight.normal,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                ],
                              ),
                            ),
                            if (unread)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(999)),
                                child: Text(
                                  thread.unreadCount > 9 ? '9+' : '${thread.unreadCount}',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white),
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
