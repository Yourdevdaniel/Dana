from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('couples', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='couplegroup',
            name='avatar',
            field=models.TextField(blank=True, null=True),
        ),
    ]
