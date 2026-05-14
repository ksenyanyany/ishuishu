import re
import json
import base64
import uuid
from django.db.models import Q
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import UserProfile, Post, Comment, Message, Notification

_SUPABASE_URL = "https://mycldqzdtuzsfztjnrva.supabase.co"
_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15Y2xkcXpkdHV6c2Z6dGpucnZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMjA1MSwiZXhwIjoyMDk0MDk4MDUxfQ.sYmoD83g2r6pmfKbrPbZlUqglJE7BRSpG2D1f6UlZVc"
_supabase = None

def _get_supabase():
    global _supabase
    if _supabase is None:
        from supabase import create_client
        _supabase = create_client(_SUPABASE_URL, _SUPABASE_KEY)
    return _supabase

def _upload_image(data_url, folder):
    """Upload a base64 data URL to Supabase storage. Returns the public URL or the original value."""
    if not data_url or data_url.startswith('http'):
        return data_url
    match = re.match(r'data:([^;]+);base64,(.+)', data_url, re.DOTALL)
    if not match:
        return data_url
    mime = match.group(1)
    ext = mime.split('/')[-1].replace('jpeg', 'jpg')
    try:
        file_bytes = base64.b64decode(match.group(2).strip())
        path = f"{folder}/{uuid.uuid4()}.{ext}"
        _get_supabase().storage.from_('media').upload(path, file_bytes, {"content-type": mime})
        return f"{_SUPABASE_URL}/storage/v1/object/public/media/{path}"
    except Exception as e:
        print(f"Supabase upload error: {e}")
        return data_url


def home(request):
    return JsonResponse({"message": "API works"})


def ping(request):
    return JsonResponse({"ok": True})


# ── helpers ───────────────────────────────────────────────────────────────────

def _make_handle(username):
    base = re.sub(r'[^a-z0-9_]', '_', username.lower())[:28]
    handle = f'@{base}'
    if not UserProfile.objects.filter(handle=handle).exists():
        return handle
    i = 1
    while UserProfile.objects.filter(handle=f'@{base}{i}').exists():
        i += 1
    return f'@{base}{i}'


def _profile_data(profile, viewer=None):
    is_following = profile.followers.filter(id=viewer.id).exists() if viewer else False
    following_count = UserProfile.objects.filter(followers=profile.user).count()
    return {
        'id': profile.user.id,
        'name': profile.name,
        'handle': profile.handle,
        'bio': profile.bio,
        'avatar': profile.avatar,
        'cover': profile.cover,
        'followers_count': profile.followers.count(),
        'following_count': following_count,
        'is_following': is_following,
    }


def _author(user):
    try:
        p = user.profile
        # Only return avatar if it's a URL (Supabase). Skip raw base64 to keep responses small.
        avatar = p.avatar if p.avatar and p.avatar.startswith('http') else ''
        return {'id': user.id, 'name': p.name, 'avatar': avatar, 'handle': p.handle}
    except UserProfile.DoesNotExist:
        return {'id': user.id, 'name': user.username, 'avatar': '', 'handle': ''}


def _parse_mentions(text):
    """Return UserProfile queryset for @handles found in text."""
    handles = re.findall(r'@(\w+)', text)
    if not handles:
        return UserProfile.objects.none()
    return UserProfile.objects.filter(
        handle__in=[f'@{h}' for h in handles]
    ).select_related('user')


def _parse_images(raw):
    """Return list of Supabase image URLs. Skips base64 data to keep responses small."""
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [img for img in parsed if img and img.startswith('http')]
    except (json.JSONDecodeError, ValueError):
        pass
    return [raw] if raw.startswith('http') else []


def _post_data(post, viewer=None):
    is_liked = post.likes.filter(id=viewer.id).exists() if viewer else False
    return {
        'id': post.id,
        'author': _author(post.author),
        'text': post.text,
        'moods': post.moods,
        'images': _parse_images(post.image),
        'created_at': post.created_at.isoformat(),
        'likes_count': post.likes.count(),
        'comments_count': post.comments.count(),
        'is_liked': is_liked,
    }


def _comment_data(comment, viewer=None, include_replies=False):
    is_liked = comment.likes.filter(id=viewer.id).exists() if viewer else False
    data = {
        'id': comment.id,
        'author': _author(comment.author),
        'text': comment.text,
        'image': comment.image if comment.image and comment.image.startswith('http') else '',
        'created_at': comment.created_at.isoformat(),
        'likes_count': comment.likes.count(),
        'is_liked': is_liked,
    }
    if include_replies:
        replies = (comment.replies
                   .select_related('author__profile')
                   .prefetch_related('likes')
                   .order_by('created_at'))
        data['replies'] = [_comment_data(r, viewer=viewer) for r in replies]
    return data


def _message_data(msg, me):
    return {
        'id': msg.id,
        'text': msg.text,
        'image': msg.image if msg.image and msg.image.startswith('http') else '',
        'created_at': msg.created_at.isoformat(),
        'is_mine': msg.sender_id == me.id,
        'is_read': msg.is_read,
    }


def _notification_data(n):
    return {
        'id': n.id,
        'type': n.type,
        'actor': _author(n.actor),
        'post_id': n.post_id,
        'post_text': n.post.text[:60] if n.post else '',
        'is_read': n.is_read,
        'created_at': n.created_at.isoformat(),
    }


# ── Auth ──────────────────────────────────────────────────────────────────────

@api_view(['POST'])
def register(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    if not username or not email or not password:
        return Response({'error': 'Все поля обязательны'}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Пользователь уже существует'}, status=400)
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email уже используется'}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    UserProfile.objects.create(user=user, name=username, handle=_make_handle(username))
    token, _ = Token.objects.get_or_create(user=user)

    return Response({'token': token.key, 'username': user.username, 'user_id': user.id}, status=201)


@api_view(['POST'])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({'error': 'Все поля обязательны'}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'Пользователь не найден'}, status=404)

    user = authenticate(username=user.username, password=password)
    if user is None:
        return Response({'error': 'Неверный пароль'}, status=401)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'username': user.username, 'user_id': user.id})


# ── Profile ───────────────────────────────────────────────────────────────────

@api_view(['GET', 'PATCH'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def my_profile(request):
    profile, _ = UserProfile.objects.get_or_create(
        user=request.user,
        defaults={'name': request.user.username, 'handle': _make_handle(request.user.username)},
    )

    if request.method == 'GET':
        return Response(_profile_data(profile))

    data = request.data
    if 'name' in data:
        profile.name = data['name'][:50]
    if 'handle' in data:
        handle = '@' + data['handle'].lstrip('@')
        if UserProfile.objects.filter(handle=handle).exclude(user=request.user).exists():
            return Response({'error': 'Хэндл уже занят'}, status=400)
        profile.handle = handle[:30]
    if 'bio' in data:
        profile.bio = data['bio'][:150]
    if 'avatar' in data:
        profile.avatar = _upload_image(data['avatar'], 'avatars')
    if 'cover' in data:
        profile.cover = _upload_image(data['cover'], 'covers')

    profile.save()
    return Response(_profile_data(profile))


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def user_profile(request, user_id):
    try:
        profile = UserProfile.objects.get(user_id=user_id)
    except UserProfile.DoesNotExist:
        return Response({'error': 'Пользователь не найден'}, status=404)
    return Response(_profile_data(profile, viewer=request.user))


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def profile_by_handle(request, handle):
    try:
        profile = UserProfile.objects.get(handle=f'@{handle}')
    except UserProfile.DoesNotExist:
        return Response({'error': 'Пользователь не найден'}, status=404)
    return Response({'id': profile.user_id})


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def follow_user(request, user_id):
    if request.user.id == user_id:
        return Response({'error': 'Нельзя подписаться на себя'}, status=400)
    try:
        profile = UserProfile.objects.get(user_id=user_id)
    except UserProfile.DoesNotExist:
        return Response({'error': 'Пользователь не найден'}, status=404)

    if profile.followers.filter(id=request.user.id).exists():
        profile.followers.remove(request.user)
        Notification.objects.filter(
            recipient=profile.user, actor=request.user, type='follow'
        ).delete()
    else:
        profile.followers.add(request.user)
        if profile.user != request.user:
            Notification.objects.get_or_create(
                recipient=profile.user, actor=request.user, type='follow',
                defaults={'post': None}
            )

    return Response({'following': profile.followers.filter(id=request.user.id).exists(),
                     'followers_count': profile.followers.count()})


# ── Followers / Following ──────────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def my_followers(request):
    profile, _ = UserProfile.objects.get_or_create(
        user=request.user,
        defaults={'name': request.user.username, 'handle': _make_handle(request.user.username)},
    )
    users = profile.followers.select_related('profile').all()
    data = []
    for u in users:
        try:
            p = u.profile
            data.append({'id': u.id, 'name': p.name, 'handle': p.handle, 'avatar': p.avatar})
        except UserProfile.DoesNotExist:
            data.append({'id': u.id, 'name': u.username, 'handle': '', 'avatar': ''})
    return Response(data)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def my_following(request):
    profiles = UserProfile.objects.filter(followers=request.user).select_related('user')
    data = [{'id': p.user.id, 'name': p.name, 'handle': p.handle, 'avatar': p.avatar} for p in profiles]
    return Response(data)


# ── Posts ─────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def posts_list(request):
    if request.method == 'GET':
        qs = Post.objects.select_related('author__profile').prefetch_related('likes', 'comments')
        author_id = request.query_params.get('author_id')
        liked_by = request.query_params.get('liked_by')
        if author_id:
            qs = qs.filter(author_id=author_id)
        if liked_by:
            qs = qs.filter(likes__id=liked_by)
        posts = qs.order_by('-created_at')
        return Response([_post_data(p, viewer=request.user) for p in posts])

    text = request.data.get('text', '').strip()
    images = request.data.get('images', [])
    if isinstance(images, list):
        images = [_upload_image(img, 'posts') for img in images if img][:4]
    else:
        images = []

    if not text and not images:
        return Response({'error': 'Добавьте текст или фото'}, status=400)

    image_stored = json.dumps(images) if images else ''

    post = Post.objects.create(
        author=request.user,
        text=text,
        moods=request.data.get('moods', []),
        image=image_stored,
    )

    for profile in _parse_mentions(text):
        if profile.user != request.user:
            Notification.objects.create(
                recipient=profile.user, actor=request.user, type='mention', post=post
            )

    return Response(_post_data(post, viewer=request.user), status=201)


@api_view(['GET', 'POST', 'PATCH', 'DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def post_detail(request, post_id):
    try:
        post = Post.objects.select_related('author__profile').prefetch_related('likes', 'comments').get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error': 'Пост не найден'}, status=404)

    if request.method == 'GET':
        return Response(_post_data(post, viewer=request.user))

    if post.author != request.user:
        return Response({'error': 'Нет прав'}, status=403)

    if request.method in ('PATCH', 'POST'):
        if 'text' in request.data:
            post.text = request.data['text'].strip()[:500]
        if 'moods' in request.data:
            post.moods = request.data['moods']
        post.save()
        return Response(_post_data(post, viewer=request.user))

    post.delete()
    return Response(status=204)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def post_edit(request, post_id):
    """Fallback POST-based edit endpoint (in case PATCH is blocked by proxy)."""
    try:
        post = Post.objects.select_related('author__profile').prefetch_related('likes', 'comments').get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error': 'Пост не найден'}, status=404)

    if post.author != request.user:
        return Response({'error': 'Нет прав'}, status=403)

    if 'text' in request.data:
        post.text = request.data['text'].strip()[:500]
    if 'moods' in request.data:
        post.moods = request.data['moods']
    post.save()
    return Response(_post_data(post, viewer=request.user))


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def like_post(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error': 'Пост не найден'}, status=404)

    if post.likes.filter(id=request.user.id).exists():
        post.likes.remove(request.user)
        Notification.objects.filter(
            recipient=post.author, actor=request.user, type='like', post=post
        ).delete()
    else:
        post.likes.add(request.user)
        if post.author != request.user:
            Notification.objects.get_or_create(
                recipient=post.author, actor=request.user, type='like', post=post
            )

    return Response({'liked': post.likes.filter(id=request.user.id).exists(),
                     'likes_count': post.likes.count()})


# ── Comments ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def post_comments(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error': 'Пост не найден'}, status=404)

    if request.method == 'GET':
        comments = (post.comments
                    .filter(parent=None)
                    .select_related('author__profile')
                    .prefetch_related('likes', 'replies__author__profile', 'replies__likes')
                    .order_by('created_at'))
        return Response([_comment_data(c, viewer=request.user, include_replies=True) for c in comments])

    text = request.data.get('text', '').strip()
    image = _upload_image(request.data.get('image', ''), 'comments')
    if not text and not image:
        return Response({'error': 'Комментарий не может быть пустым'}, status=400)

    parent_id = request.data.get('parent_id')
    parent = None
    if parent_id:
        try:
            parent_comment = Comment.objects.get(id=parent_id, post=post)
            # Always reply to top-level (no deep nesting)
            parent = parent_comment.parent or parent_comment
        except Comment.DoesNotExist:
            pass

    comment = Comment.objects.create(post=post, author=request.user, text=text, image=image, parent=parent)

    notified = set()

    if parent:
        # Notify the parent comment's author: "ответил на ваш комментарий"
        if parent.author != request.user:
            Notification.objects.create(
                recipient=parent.author, actor=request.user, type='reply', post=post
            )
            notified.add(parent.author_id)
    elif post.author != request.user:
        # Notify post author: "прокомментировал ваш пост"
        Notification.objects.create(
            recipient=post.author, actor=request.user, type='comment', post=post
        )
        notified.add(post.author_id)

    # Notify @mentioned users
    for profile in _parse_mentions(text):
        if profile.user != request.user and profile.user_id not in notified:
            Notification.objects.create(
                recipient=profile.user, actor=request.user, type='mention', post=post
            )
            notified.add(profile.user_id)

    return Response(_comment_data(comment, viewer=request.user), status=201)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def like_comment(request, comment_id):
    try:
        comment = Comment.objects.get(id=comment_id)
    except Comment.DoesNotExist:
        return Response({'error': 'Комментарий не найден'}, status=404)

    if comment.likes.filter(id=request.user.id).exists():
        comment.likes.remove(request.user)
    else:
        comment.likes.add(request.user)

    return Response({'liked': comment.likes.filter(id=request.user.id).exists(),
                     'likes_count': comment.likes.count()})


# ── User comments (replies tab) ───────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def user_comments(request, user_id):
    comments = (Comment.objects
                .filter(author_id=user_id)
                .select_related('author__profile', 'post__author__profile')
                .prefetch_related('likes')
                .order_by('-created_at')[:50])

    data = []
    for c in comments:
        d = _comment_data(c, viewer=request.user)
        d['post'] = {
            'id': c.post.id,
            'text': c.post.text[:80],
            'author': _author(c.post.author),
        }
        data.append(d)
    return Response(data)


# ── Search ────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def search(request):
    q = request.query_params.get('q', '').strip()
    if not q:
        return Response({'users': [], 'posts': []})

    profiles = (UserProfile.objects
                .filter(Q(name__icontains=q) | Q(handle__icontains=q))
                .exclude(user=request.user)
                .select_related('user')
                .prefetch_related('followers')[:15])

    users = [
        {
            'id': p.user.id,
            'name': p.name,
            'handle': p.handle,
            'avatar': p.avatar,
            'is_following': p.followers.filter(id=request.user.id).exists(),
        }
        for p in profiles
    ]

    posts = (Post.objects
             .filter(Q(text__icontains=q) | Q(moods__icontains=q))
             .select_related('author__profile')
             .prefetch_related('likes', 'comments')
             .order_by('-created_at')[:20])

    return Response({'users': users, 'posts': [_post_data(p, viewer=request.user) for p in posts]})


# ── Chats ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def chats_list(request):
    me = request.user
    sent_ids = Message.objects.filter(sender=me).values_list('receiver_id', flat=True).distinct()
    recv_ids = Message.objects.filter(receiver=me).values_list('sender_id', flat=True).distinct()
    partner_ids = set(list(sent_ids) + list(recv_ids))

    chats = []
    for pid in partner_ids:
        try:
            partner = User.objects.select_related('profile').get(id=pid)
        except User.DoesNotExist:
            continue

        last_msg = (Message.objects
                    .filter(Q(sender=me, receiver_id=pid) | Q(sender_id=pid, receiver=me))
                    .order_by('-created_at').first())
        unread = Message.objects.filter(sender_id=pid, receiver=me, is_read=False).count()

        chats.append({
            'partner': _author(partner),
            'last_message': {
                'text': last_msg.text,
                'image': last_msg.image if last_msg.image and last_msg.image.startswith('http') else '',
                'created_at': last_msg.created_at.isoformat(),
                'is_mine': last_msg.sender_id == me.id,
            } if last_msg else None,
            'unread_count': unread,
        })

    chats.sort(key=lambda c: c['last_message']['created_at'] if c['last_message'] else '', reverse=True)
    return Response(chats)


@api_view(['GET', 'POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def chat_messages(request, user_id):
    me = request.user
    try:
        partner = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Пользователь не найден'}, status=404)

    if request.method == 'GET':
        msgs = (Message.objects
                .filter(Q(sender=me, receiver=partner) | Q(sender=partner, receiver=me))
                .order_by('created_at'))
        # mark received messages as read
        msgs.filter(sender=partner, is_read=False).update(is_read=True)
        return Response([_message_data(m, me) for m in msgs])

    text = request.data.get('text', '').strip()
    image = _upload_image(request.data.get('image', ''), 'messages')
    if not text and not image:
        return Response({'error': 'Сообщение не может быть пустым'}, status=400)

    msg = Message.objects.create(sender=me, receiver=partner, text=text, image=image)
    return Response(_message_data(msg, me), status=201)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def chat_read(request, user_id):
    Message.objects.filter(sender_id=user_id, receiver=request.user, is_read=False).update(is_read=True)
    return Response({'ok': True})


# ── Notifications ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def notifications_list(request):
    notifs = (Notification.objects
              .filter(recipient=request.user)
              .select_related('actor__profile', 'post')
              .order_by('-created_at')[:50])
    return Response([_notification_data(n) for n in notifs])


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def notifications_read(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'ok': True})


# ── Admin ──────────────────────────────────────────────────────────────────────

def _require_staff(request):
    if not request.user.is_staff:
        return Response({'error': 'forbidden'}, status=403)
    return None


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_users(request):
    err = _require_staff(request)
    if err: return err
    users = User.objects.select_related('profile').order_by('-date_joined')
    data = []
    for u in users:
        try:
            p = u.profile
            name, handle, avatar = p.name, p.handle, p.avatar if p.avatar and p.avatar.startswith('http') else ''
        except Exception:
            name, handle, avatar = u.username, '', ''
        data.append({
            'id': u.id, 'username': u.username, 'email': u.email,
            'name': name, 'handle': handle, 'avatar': avatar,
            'is_active': u.is_active, 'is_staff': u.is_staff,
            'date_joined': u.date_joined.isoformat(),
        })
    return Response(data)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_ban_user(request, user_id):
    err = _require_staff(request)
    if err: return err
    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'not found'}, status=404)
    if u.is_staff:
        return Response({'error': 'cannot ban staff'}, status=400)
    u.is_active = not u.is_active
    u.save()
    return Response({'id': u.id, 'is_active': u.is_active})


@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_delete_user(request, user_id):
    err = _require_staff(request)
    if err: return err
    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'not found'}, status=404)
    if u.is_staff:
        return Response({'error': 'cannot delete staff'}, status=400)
    u.delete()
    return Response({'ok': True})


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_posts(request):
    err = _require_staff(request)
    if err: return err
    posts = Post.objects.select_related('author__profile').order_by('-created_at')[:200]
    data = []
    for p in posts:
        try:
            handle = p.author.profile.handle
        except Exception:
            handle = p.author.username
        data.append({
            'id': p.id, 'text': p.text[:200], 'handle': handle,
            'author_id': p.author_id, 'created_at': p.created_at.isoformat(),
            'likes': p.likes.count(), 'comments': p.comments.count(),
        })
    return Response(data)


@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_delete_post(request, post_id):
    err = _require_staff(request)
    if err: return err
    try:
        p = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error': 'not found'}, status=404)
    p.delete()
    return Response({'ok': True})
