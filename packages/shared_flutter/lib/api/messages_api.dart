import '../models.dart';
import 'client.dart';

Future<List<Message>> fetchMessages(int bookingId) async {
  final response = await ApiClient.instance.dio.get('/bookings/$bookingId/messages');
  return (response.data as List).map((e) => Message.fromJson(e as Map<String, dynamic>)).toList();
}

Future<Message> sendMessage(int bookingId, String body) async {
  final response = await ApiClient.instance.dio.post('/bookings/$bookingId/messages', data: {'body': body});
  return Message.fromJson(response.data as Map<String, dynamic>);
}
