from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_user_email_verification_avatar_base64"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="is_email_verified",
        ),
        migrations.RemoveField(
            model_name="user",
            name="email_verification_token",
        ),
        migrations.RemoveField(
            model_name="user",
            name="email_verification_expires",
        ),
    ]
