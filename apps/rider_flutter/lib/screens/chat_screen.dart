import 'dart:async';

import 'package:flutter/material.dart';

import '../api/client.dart';
import '../api/messages_api.dart';
import '../models.dart';
import '../theme.dart';

const _pollInterval = Duration(seconds: 4);

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.bookingId, this.title, this.subtitle});

  final int bookingId;
  final String? title;
  final String? subtitle;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _bodyController = TextEditingController();
  final _scrollController = ScrollController();

  List<Message> messages = [];
  bool loading = true;
  bool sending = false;
  String? error;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _load();
    _pollTimer = Timer.periodic(_pollInterval, (_) => _load());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _bodyController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final result = await fetchMessages(widget.bookingId);
      if (!mounted) return;
      setState(() => messages = result);
    } catch (_) {
      // Keep the last known messages on a transient poll failure.
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _scrollToBottom() {
    if (!_scrollController.hasClients) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _handleSend() async {
    final trimmed = _bodyController.text.trim();
    if (trimmed.isEmpty || sending) return;
    setState(() {
      sending = true;
      error = null;
    });
    try {
      final message = await sendMessage(widget.bookingId, trimmed);
      setState(() {
        messages = [...messages, message];
        _bodyController.clear();
      });
      _scrollToBottom();
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title ?? 'Discussion'),
        bottom: widget.subtitle != null
            ? PreferredSize(
                preferredSize: const Size.fromHeight(20),
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(widget.subtitle!, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
                ),
              )
            : null,
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                Expanded(
                  child: messages.isEmpty
                      ? const Center(
                          child: Text(
                            "Aucun message pour l'instant. Dites bonjour !",
                            style: TextStyle(color: AppColors.textMuted, fontSize: 14),
                            textAlign: TextAlign.center,
                          ),
                        )
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.all(AppSpacing.md),
                          itemCount: messages.length,
                          itemBuilder: (context, index) {
                            final m = messages[index];
                            return Align(
                              alignment: m.isMine ? Alignment.centerRight : Alignment.centerLeft,
                              child: Container(
                                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                                margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
                                decoration: BoxDecoration(
                                  color: m.isMine ? AppColors.primary : AppColors.surface,
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                  border: m.isMine ? null : Border.all(color: AppColors.border),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (!m.isMine)
                                      Padding(
                                        padding: const EdgeInsets.only(bottom: 2),
                                        child: Text(m.senderName ?? '',
                                            style: const TextStyle(
                                                fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                                      ),
                                    Text(m.body,
                                        style: TextStyle(fontSize: 14.5, color: m.isMine ? Colors.white : AppColors.text)),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
                if (error != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                    child: Text(error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                  ),
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _bodyController,
                            minLines: 1,
                            maxLines: 4,
                            decoration: const InputDecoration(hintText: 'Écrire un message...'),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        ElevatedButton(
                          onPressed: sending ? null : _handleSend,
                          child: sending
                              ? const SizedBox(
                                  height: 16,
                                  width: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text('Envoyer'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
