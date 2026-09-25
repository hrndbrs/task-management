"use client";

import { usePresenceChannel } from "@laravel/echo-react";
import { useCallback, useRef, useSyncExternalStore } from "react";

export type PresenceMember = { id: number; name: string };

type PresenceSubscription = {
  subscribed: boolean;
  members: { each(callback: (member: { info: PresenceMember }) => void): void };
  bind(event: string, callback: () => void): void;
  unbind(event: string, callback: () => void): void;
};

const MEMBER_EVENTS = ["pusher:subscription_succeeded", "pusher:member_added", "pusher:member_removed"];
const NO_MEMBERS: PresenceMember[] = [];

export function usePresence(channelName: string) {
  const { channel } = usePresenceChannel<"reverb">(channelName);
  const members = useRef(NO_MEMBERS);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const subscription = channel()?.subscription as unknown as PresenceSubscription | undefined;
      if (!subscription) return () => {};

      const sync = () => {
        const list: PresenceMember[] = [];
        subscription.members.each((member) => list.push(member.info));
        members.current = list.sort((a, b) => a.name.localeCompare(b.name));
        onChange();
      };

      MEMBER_EVENTS.forEach((event) => subscription.bind(event, sync));
      if (subscription.subscribed) sync();

      return () => {
        MEMBER_EVENTS.forEach((event) => subscription.unbind(event, sync));
        members.current = NO_MEMBERS;
      };
    },
    [channel],
  );

  const list = useSyncExternalStore(
    subscribe,
    () => members.current,
    () => NO_MEMBERS,
  );

  return { members: list, channel };
}
