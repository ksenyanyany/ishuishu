import re
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


def home(request):
    return JsonResponse({"message": "API works"})


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
        return {'id': user.id, 'name': p.name, 'avatar': p.avatar}
    except UserProfile.DoesNotExist:
        return {'id': user.id, 'name': user.username, 'avatar': ''}


def _post_data(post, viewer=None):
    is_liked = post.likes.filter(id=viewer.id).exists() if viewer else False
    return {
        'id': post.id,
        'author': _author(post.author),
        'text': post.text,
        'moods': post.moods,
        'image': post.image,
        'created_at': post.created_at.isoformat(),
        'likes_count': post.likes.count(),
        'comments_count': post.comments.count(),
        'is_liked': is_liked,
    }


def _comment_data(comment, viewer=None):
    is_liked = comment.likes.filter(id=viewer.id).exists() if viewer else False
    return {
        'id': comment.id,
        'author': _author(comment.author),
        'text': comment.text,
        'image': comment.image,
        'created_at': comment.created_at.isoformat(),
        'likes_count': comment.likes.count(),
        'is_liked': is_liked,
    }


def _message_data(msg, me):
    return {
        'id': msg.id,
        'text': msg.text,
        'image': msg.image,
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
        profile.avatar = data['avatar']
    if 'cover' in data:
        profile.cover = data['cover']

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
    if not text:
        return Response({'error': 'Текст обязателен'}, status=400)

    post = Post.objects.create(
        author=request.user,
        text=text,
        moods=request.data.get('moods', []),
        image=request.data.get('image', ''),
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
                    .select_related('author__profile')
                    .prefetch_related('likes')
                    .order_by('created_at'))
        return Response([_comment_data(c, viewer=request.user) for c in comments])

    text = request.data.get('text', '').strip()
    image = request.data.get('image', '')
    if not text and not image:
        return Response({'error': 'Комментарий не может быть пустым'}, status=400)

    comment = Comment.objects.create(post=post, author=request.user, text=text, image=image)

    if post.author != request.user:
        Notification.objects.create(
            recipient=post.author, actor=request.user, type='comment', post=post
        )

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
                'image': last_msg.image,
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
    image = request.data.get('image', '')
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
