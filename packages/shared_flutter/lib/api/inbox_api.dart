import '../models.dart';
import 'client.dart';

Future<InboxResponse> fetchInbox() async {
  final response = await ApiClient.instance.dio.get('/inbox');
  return InboxResponse.fromJson(response.data as Map<String, dynamic>);
}
