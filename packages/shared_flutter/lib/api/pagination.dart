/// Generic wrapper for Laravel's paginated JSON responses. `currentPage`/
/// `lastPage` only come back from endpoints that actually paginate (trip
/// search); callers that only ever get a single page (e.g. the driver's
/// own trip list) just leave them at their defaults.
class Paginated<T> {
  final List<T> data;
  final int currentPage;
  final int lastPage;

  Paginated({required this.data, this.currentPage = 1, this.lastPage = 1});

  factory Paginated.fromJson(Map<String, dynamic> json, T Function(Map<String, dynamic>) fromJson) {
    final meta = json['meta'] as Map<String, dynamic>?;
    return Paginated(
      data: (json['data'] as List).map((e) => fromJson(e as Map<String, dynamic>)).toList(),
      currentPage: meta?['current_page'] as int? ?? 1,
      lastPage: meta?['last_page'] as int? ?? 1,
    );
  }
}
