import { useParams } from '@tanstack/react-router';
import ChatView from '../components/ChatView';

export default function DMView() {
  const { channelId } = useParams({ from: '/dms/$channelId' });
  const decoded = decodeURIComponent(channelId);

  return (
    <ChatView
      channel={decoded}
      channelType="dm"
      title={`💬 ${decoded.replace('DM-', '').slice(0, 30)}...`}
    />
  );
}
