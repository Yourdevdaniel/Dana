from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_remove_email_verification_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='show_group_on_profile',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='show_membership_on_other_profiles',
            field=models.BooleanField(default=True),
        ),
    ]
