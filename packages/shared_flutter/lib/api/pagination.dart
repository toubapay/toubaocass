/// Generic wrapper for Laravel's paginated JSON responses. `currentPage`/
/// `lastPage` only come back from endpoints that actually paginate (trip
/// search); callers that only ever get a single page (e.g. the driver's
/// own trip list) just leave them at their defaults.
class Paginated<T> {
  final List<T> data;
  final int currentPage;
  final int lastPage;

  /// Total item count across every page, not just this one — falls back to
  /// this page's own length when the endpoint doesn't paginate at all.
  final int total;

  Paginated({required this.data, this.currentPage = 1, this.lastPage = 1, int? total}) : total = total ?? data.length;

  factory Paginated.fromJson(Map<String, dynamic> json, T Function(Map<String, dynamic>) fromJson) {
    final meta = json['meta'] as Map<String, dynamic>?;
    final data = (json['data'] as List).map((e) => fromJson(e as Map<String, dynamic>)).toList();
    return Paginated(
      data: data,
      currentPage: meta?['current_page'] as int? ?? 1,
      lastPage: meta?['last_page'] as int? ?? 1,
      total: meta?['total'] as int? ?? data.length,
    );
  }
}
